import { z } from 'zod';
import { discoveryRetryDelay, readDiscoveryJson } from '@/lib/services/discovery-http';

const url = 'https://api.kick.com/public/v2/categories?name=synthetic';
const schema = z.object({ ok: z.boolean() });
const json = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, ...(headers ? { headers } : {}) });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it.each(['https://kick.com/api/v2/channels/foo', 'https://evil.invalid/', 'http://api.kick.com/public/v2/categories'])
('rejects undocumented or unsafe destinations before fetch: %s', async target => {
  const fetcher = jest.spyOn(global, 'fetch');
  await expect(readDiscoveryJson(target, schema)).rejects.toMatchObject({ code: 'invalid_input' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('respects a numeric Retry-After without retrying early', async () => {
  jest.useFakeTimers();
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValueOnce(json({}, 429, { 'Retry-After': '2' }))
    .mockResolvedValueOnce(json({ ok: true }));
  const pending = readDiscoveryJson(url, schema);
  await jest.advanceTimersByTimeAsync(1999);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  await expect(pending).resolves.toEqual({ ok: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('defers long or malformed cooldowns without shortening the wait', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(json({}, 429, { 'Retry-After': '120' }));
  await expect(readDiscoveryJson(url, schema)).rejects.toMatchObject({ code: 'rate_limited', retryAfterMs: 120000 });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(discoveryRetryDelay('invalid header')).toBe(Infinity);
  expect(discoveryRetryDelay('-1')).toBe(Infinity);
  expect(discoveryRetryDelay('9'.repeat(400))).toBe(Infinity);
});

it('supports HTTP-date cooldowns', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');
  expect(discoveryRetryDelay('Thu, 01 Jan 2026 00:00:04 GMT', now)).toBe(4000);
});

it('bounds retries even if the provider repeatedly requests an immediate retry', async () => {
  jest.useFakeTimers();
  const fetcher = jest.spyOn(global, 'fetch').mockImplementation(async () => json({}, 429, { 'Retry-After': '0' }));
  const pending = expect(readDiscoveryJson(url, schema)).rejects.toMatchObject({ code: 'rate_limited' });
  await jest.runAllTimersAsync();
  await pending;
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('does not submit a request for a pre-aborted signal', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = jest.spyOn(global, 'fetch');
  await expect(readDiscoveryJson(url, schema, {}, { signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('cancels during Retry-After without a later request', async () => {
  jest.useFakeTimers();
  const controller = new AbortController();
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(json({}, 429, { 'Retry-After': '2' }));
  const pending = expect(readDiscoveryJson(url, schema, {}, { signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' });
  await jest.advanceTimersByTimeAsync(10);
  controller.abort();
  await jest.runAllTimersAsync();
  await pending;
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('times out a transport that ignores AbortSignal, and never accepts a late body', async () => {
  jest.useFakeTimers();
  let resolveResponse: ((value: Response) => void) | undefined;
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(resolve => { resolveResponse = resolve; }));
  const pending = expect(readDiscoveryJson(url, schema, {}, { timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout' });
  await jest.advanceTimersByTimeAsync(10);
  await pending;
  resolveResponse?.(json({ ok: true }));
  await jest.runAllTimersAsync();
});

it('includes JSON body parsing in the deadline', async () => {
  jest.useFakeTimers();
  const response = json({ ok: true });
  jest.spyOn(response, 'json').mockImplementation(() => new Promise(() => undefined));
  jest.spyOn(global, 'fetch').mockResolvedValue(response);
  const pending = expect(readDiscoveryJson(url, schema, {}, { timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout' });
  await jest.advanceTimersByTimeAsync(10);
  await pending;
});

it('sanitizes network errors and validates successful payloads', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('PRIVATE_TOKEN_IN_URL'))
    .mockResolvedValueOnce(json({ ok: 'not boolean', email: 'PRIVATE' }));
  await expect(readDiscoveryJson(url, schema)).rejects.toThrow('Discovery provider: request_failed');
  await expect(readDiscoveryJson(url, schema)).rejects.toThrow('Discovery provider: invalid_response');
});
