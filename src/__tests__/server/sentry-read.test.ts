jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: { SENTRY_READ_TOKEN: 'isolated-test-token' } }));

import { env } from '@/lib/env';
import { readSentryIssues } from '@/lib/agents/sentry/client';

const issue = {
  id: '123', shortId: 'SOCIALPRO-WEB-TEST', title: 'Cannot read properties of undefined test@example.invalid secret=abcdef123456',
  status: 'unresolved', level: 'error', count: '0',
  firstSeen: '2026-09-11T10:00:00Z', lastSeen: '2026-09-11T10:01:00Z',
  project: { id: '4512044852772944', slug: 'socialpro-web' },
  users: [{ email: 'private@example.invalid' }], culprit: 'private route',
};
const link = '<https://de.sentry.io/>; rel="next"; results="false"';
const response = (data: unknown, headers: Record<string, string> = { link }) => new Response(JSON.stringify(data), { headers });

afterEach(() => jest.restoreAllMocks());

test('scoped GET, stable IDs on repeat, no raw messages or user data', async () => {
  const fetcher = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => response([issue]));
  const first = await readSentryIssues();
  const replay = await readSentryIssues();
  expect(first).toMatchObject({ status: 'available', coverage: 'complete_for_query', returnedByProvider: 1,
    issues: [{ issueId: '123', providerReportedEventCount: '0', category: 'undefined_property_access' }] });
  if (!('issues' in first) || !('issues' in replay)) throw new Error('Expected both reads to succeed');
  expect(replay.issues).toEqual(first.issues);
  expect(fetcher).toHaveBeenCalledTimes(2);
  for (const [url, options] of fetcher.mock.calls) {
    expect(String(url)).toContain('https://de.sentry.io/api/0/organizations/social-pro-rg/issues/');
    expect(String(url)).toContain('project=4512044852772944');
    expect(options).toMatchObject({ method: 'GET', redirect: 'error', headers: { Authorization: 'Bearer isolated-test-token' } });
  }
  expect(JSON.stringify(first)).not.toMatch(/example\.invalid|abcdef|private route|isolated-test-token/);
});

test('missing token makes no request and is unavailable, not zero', async () => {
  jest.replaceProperty(env, 'SENTRY_READ_TOKEN', undefined);
  const fetcher = jest.spyOn(globalThis, 'fetch');
  expect(await readSentryIssues()).toMatchObject({ status: 'unavailable', reason: 'not_configured' });
  expect(fetcher).not.toHaveBeenCalled();
});

test.each([401, 403, 429, 500])('HTTP %i is unavailable without echoing body', async (status) => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('sensitive provider message', { status }));
  const output = await readSentryIssues();
  expect(output).toMatchObject({ status: 'unavailable', reason: `http_${status}` });
  expect(output).not.toHaveProperty('issues');
  expect(JSON.stringify(output)).not.toContain('sensitive');
});

test('network failure does not expose exceptions or credentials', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Bearer isolated-test-token'));
  expect(await readSentryIssues()).toMatchObject({ status: 'unavailable', reason: 'request_or_parse_failed' });
});

test.each([
  [{ ...issue, project: { id: '2', slug: 'other-project' } }],
  [{ ...issue, count: '-1' }], [{ ...issue, status: 'resolved' }],
  [{ ...issue, lastSeen: 'not-a-date' }], { error: 'bad' },
])('invalid or out-of-scope response is rejected', async (body) => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(body));
  expect(await readSentryIssues()).toMatchObject({ status: 'unavailable', reason: 'invalid_response' });
});

test('explicit empty query result is distinguishable from failure', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response([]));
  expect(await readSentryIssues()).toMatchObject({ status: 'available', returnedByProvider: 0, issues: [], coverage: 'complete_for_query' });
});

test.each([{ link: '<https://de.sentry.io/>; rel="next"; results="true"' }, {}])('pagination never pretends full coverage', async (headers) => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response([issue], headers));
  expect(await readSentryIssues()).toMatchObject({ status: 'available', coverage: 'partial' });
});

test('tool output is bounded and says when truncated', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(Array.from({ length: 21 }, () => issue)));
  const result = await readSentryIssues();
  expect(result).toMatchObject({ coverage: 'partial', truncated: true, returnedByProvider: 21 });
  if (!('issues' in result)) throw new Error('Expected successful bounded read');
  expect(result.issues).toHaveLength(20);
});

test('oversized response is unavailable before JSON parsing', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('x'.repeat(1_000_001)));
  expect(await readSentryIssues()).toMatchObject({ status: 'unavailable', reason: 'response_too_large' });
});
