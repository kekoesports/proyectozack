import {
  creatorEnrichmentInputSchema, creatorPublicEmailSchema, creatorPublicUrlSchema,
  type CreatorEnrichmentResult, type CreatorPublicText,
} from '@/lib/schemas/creator-enrichment';
import type { CreatorObservation, CreatorPlatform } from '@/lib/schemas/creator-search-profile';
import { normalizeSocialProfileUrl } from '@/lib/utils/social-profile-url';
import { creatorObservation } from './creator-observations';

const CONTACT_CONTEXT = /\b(?:business(?: inquiries)?|professional contact|management|manager|bookings?|sponsorships?|partnerships?|commercial|comercial|colaboraciones|negocios|contrataciones|contacto(?: profesional)?|contact)\b/i;
const PRIVATE_CONTEXT = /\b(?:private|personal|privado|personal email|do not contact|no contactar)\b/i;
const MANAGEMENT_LABEL = /(?:^|\n)\s*(?:management|managed by|manager|representado por|agencia)\s*[:\-–]\s*([^\n]{1,400})/gi;
const EMAIL = /(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9._%+-])/gi;
const URL_IN_TEXT = /https?:\/\/[^\s<>()"'\x60]+/gi;
const RESERVED = new Set(['directory', 'browse', 'search', 'downloads', 'settings', 'login', 'signup', 'register',
  'auth', 'dashboard', 'following', 'categories', 'video', 'videos', 'p', 'reel', 'reels', 'stories', 'tv',
  'explore', 'accounts', 'direct', 'challenge', 'oauth', 'about', 'legal', 'privacy', 'turbo', 'inventory', 'subscriptions']);

/** No DNS/network call. Literal IPs, local names, credentials and non-web schemes are rejected. */
export function safeCreatorPublicWebsite(input: string): string | null {
  const parsed = creatorPublicUrlSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    const url = new URL(parsed.data);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.username || url.password || url.port || !host.includes('.') || host.includes(':')
      || /^[0-9.]+$/.test(host)
      || /(^|\.)(localhost|local|internal|test|invalid|example|onion|home|lan)$/.test(host)
      || host.length > 253
      || host.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
    url.hostname = host;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

/** Profile links only, not videos/shorteners. Reuse the existing canonicalizer AFTER stricter validation. */
function socialProfile(input: string): { platform: CreatorPlatform; url: string } | null {
  const safe = safeCreatorPublicWebsite(input);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.replace(/^www\./, '');
  let platform: CreatorPlatform;
  let path: string;
  try { path = decodeURIComponent(url.pathname).replace(/\/+$/, ''); } catch { return null; }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    platform = 'youtube';
    if (!/^\/(?:channel\/UC[A-Za-z0-9_-]{22}|@[\p{L}\p{N}_.·-]{3,30}|(?:c|user)\/[A-Za-z0-9_-]{1,100})$/u.test(path)) return null;
  } else if (host === 'twitch.tv' || host === 'm.twitch.tv') {
    platform = 'twitch';
    if (!/^\/[A-Za-z0-9_]{1,25}(?:\/about)?$/.test(path)) return null;
    path = path.replace(/\/about$/, '');
  } else if (host === 'kick.com') {
    platform = 'kick';
    if (!/^\/[A-Za-z0-9_-]{1,25}$/.test(path)) return null;
  } else if (host === 'instagram.com') {
    platform = 'instagram';
    if (!/^\/[A-Za-z0-9_.]{1,30}$/.test(path)) return null;
  } else return null;
  if (RESERVED.has(path.slice(1).toLowerCase())) return null;
  url.pathname = platform === 'youtube' ? path : path.toLowerCase();
  url.search = '';
  const canonical = normalizeSocialProfileUrl({ platform, profileUrl: url.toString() });
  return canonical ? { platform, url: canonical } : null;
}

function cleanManagement(value: string): string | null {
  const visible = value.replace(EMAIL, '').replace(URL_IN_TEXT, '').replace(/[<>\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ').replace(/^[\s:|,;\-–]+|[\s:|,;\-–]+$/g, '').trim();
  return visible ? visible.slice(0, 160) : null;
}

function explicitEmail(value: string): string | null {
  const parsed = creatorPublicEmailSchema.safeParse(value.trim());
  if (!parsed.success) return null;
  const separator = parsed.data.lastIndexOf('@');
  return parsed.data.slice(0, separator + 1) + parsed.data.slice(separator + 1).toLowerCase();
}

/** Pure public-field extraction. Links are review suggestions, never identity merges or outreach authority. */
export function enrichPublicCreator(input: unknown): CreatorEnrichmentResult {
  const parsed = creatorEnrichmentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const data = parsed.data;
  const syncedAt = new Date(data.syncedAt);
  const observation = (value: string | null, field?: CreatorPublicText): CreatorObservation => ({
    ...creatorObservation(value, field?.source ?? 'enrichment:public_input', syncedAt, 'unavailable', 'MEDIUM'),
    observed_at: value !== null && field ? field.observedAt : null,
  });
  const emails = new Map<string, { email: string; field: CreatorPublicText }>();
  const links = new Map<string, { platform: CreatorPlatform; url: string; field: CreatorPublicText }>();
  const warnings = new Set<'ambiguous_professional_email' | 'invalid_public_url' | 'crosslink_limit'>();
  let management: { text: string; field: CreatorPublicText } | null = null;
  const addEmail = (value: string, field: CreatorPublicText): void => {
    const email = explicitEmail(value);
    if (email && !emails.has(email.toLowerCase())) emails.set(email.toLowerCase(), { email, field });
  };
  const addLink = (value: string, field: CreatorPublicText): void => {
    const link = socialProfile(value);
    if (!link || links.has(link.url)) return;
    if (links.size >= 20) { warnings.add('crosslink_limit'); return; }
    links.set(link.url, { ...link, field });
  };
  for (const field of data.professionalPublicFields) {
    if (field.kind === 'business_email') addEmail(field.value, field);
    if (field.kind === 'management' && !management) {
      const text = cleanManagement(field.value);
      if (text) management = { text, field };
    }
    if (field.kind === 'social_url') addLink(field.value, field);
  }
  if (data.bio) {
    const bio = data.bio;
    for (const line of bio.value.split(/[\r\n]+/)) {
      if (!CONTACT_CONTEXT.test(line) || PRIVATE_CONTEXT.test(line)) continue;
      for (const match of line.matchAll(EMAIL)) {
        // The professional context must be close to this address; no biography-wide inferred contact.
        const preceding = line.slice(Math.max(0, (match.index ?? 0) - 120), match.index);
        if (CONTACT_CONTEXT.test(preceding)) addEmail(match[0], bio);
      }
    }
    for (const match of bio.value.matchAll(URL_IN_TEXT)) addLink(match[0].replace(/[.,;!?]+$/, ''), bio);
    for (const match of bio.value.matchAll(MANAGEMENT_LABEL)) {
      if (management || !match[1] || PRIVATE_CONTEXT.test(match[1])) continue;
      const text = cleanManagement(match[1]);
      if (text) management = { text, field: bio };
    }
  }
  const website = data.website ? safeCreatorPublicWebsite(data.website.value) : null;
  if (data.website && !website) warnings.add('invalid_public_url');
  if (website && data.website) addLink(website, data.website);
  if (emails.size > 1) warnings.add('ambiguous_professional_email');
  const email = emails.size === 1 ? [...emails.values()][0] : undefined;
  return {
    ok: true, error: null,
    fields: {
      contactEmail: observation(email?.email ?? null, email?.field),
      website: observation(website, data.website),
      management: observation(management?.text ?? null, management?.field),
    },
    crosslinks: [...links.values()].map(link => ({
      platform: link.platform, observation: observation(link.url, link.field), requiresReview: true, autoMerge: false,
    })),
    warnings: [...warnings],
  };
}
