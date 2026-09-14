import 'server-only';

import { env } from '@/lib/env';
import { sentryIssueListSchema, type SentryIssue } from '@/lib/schemas/sentryIssues';

const PROJECT = '4512044852772944';
const API = 'https://de.sentry.io/api/0/organizations/social-pro-rg/issues/';

// Labels are fixed: never forward arbitrary exception messages, URLs or event payloads.
function classifyIssue(title: string): string {
  if (/google-analytics\.com/i.test(title) && /fetch/i.test(title)) return 'analytics_request_failure';
  if (/cannot read properties of undefined/i.test(title)) return 'undefined_property_access';
  if (/read.?only property/i.test(title)) return 'read_only_property_mutation';
  return 'requires_sentry_detail_review';
}

function summarize(issue: SentryIssue) {
  return {
    issueId: issue.id, reference: issue.shortId, severity: issue.level,
    status: issue.status, category: classifyIssue(issue.title),
    providerReportedEventCount: issue.count,
    firstSeen: issue.firstSeen, lastSeen: issue.lastSeen,
    url: `https://social-pro-rg.sentry.io/issues/${issue.id}/`,
  };
}

export async function readSentryIssues() {
  const base = {
    checkedAt: new Date().toISOString(), source: 'sentry', project: 'socialpro-web',
    query: 'is:unresolved', selectionWindow: '14d', readOnly: true,
    coverageNote: 'Read on agent runs, not a realtime stream. Counts are reported by Sentry. No raw events, users, breadcrumbs or request data.',
  };
  const token = env.SENTRY_READ_TOKEN;
  if (!token) return { ...base, status: 'unavailable', reason: 'not_configured' };
  const url = new URL(API);
  url.search = new URLSearchParams({ project: PROJECT, query: 'is:unresolved', statsPeriod: '14d', sort: 'date', limit: '100' }).toString();
  try {
    const response = await fetch(url, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) return { ...base, status: 'unavailable', reason: `http_${response.status}` };
    // Limit the response while reading; an oversized or partial response is never an empty result.
    const reader = response.body?.getReader();
    if (!reader) return { ...base, status: 'unavailable', reason: 'empty_body' };
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 1_000_000) {
          await reader.cancel();
          return { ...base, status: 'unavailable', reason: 'response_too_large' };
        }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const parsed = sentryIssueListSchema.safeParse(body);
    if (!parsed.success) return { ...base, status: 'unavailable', reason: 'invalid_response' };
    const paginationUnknown = !response.headers.has('link');
    const morePages = (response.headers.get('link') ?? '').split(',')
      .some((part) => /rel="next"/.test(part) && /results="true"/.test(part));
    const truncated = parsed.data.length > 20;
    return {
      ...base, status: 'available', returnedByProvider: parsed.data.length,
      coverage: paginationUnknown || morePages || truncated ? 'partial' : 'complete_for_query',
      morePages, paginationUnknown, truncated, issues: parsed.data.slice(0, 20).map(summarize),
    };
  } catch {
    return { ...base, status: 'unavailable', reason: 'request_or_parse_failed' };
  }
}
