import { z } from 'zod';
import { readProviderJson } from '@/lib/services/provider-http';

const schema = z.object({ count: z.number().int().nonnegative() });
beforeEach(() => { jest.useFakeTimers(); jest.spyOn(globalThis, 'fetch'); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('validates a real zero and cleans its deadline', async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('{"count":0}'));
  expect(await readProviderJson('https://example.invalid/read', schema, 'Synthetic')).toEqual({ count: 0 });
  expect(jest.getTimerCount()).toBe(0);
});
it.each([-1, 0.5, '3', null])('rejects invalid metric %j without exposing raw data', async count => {
  jest.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ count, secret: 'private-marker' })));
  await expect(readProviderJson('https://example.invalid/read', schema, 'Synthetic')).rejects.toThrow('coverage invalid');
});
it('does not leak a rejected response body or request URL and does not retry', async () => {
  jest.mocked(fetch).mockResolvedValue(new Response('private-marker', { status: 429 }));
  await expect(readProviderJson('https://example.invalid/?key=private-marker', schema, 'Synthetic'))
    .rejects.toMatchObject({ code: 'rate_limited', httpStatus: 429, message: 'Synthetic error (429)' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('rejects a pre-aborted request without sending it', async () => {
  const parent = new AbortController(); parent.abort();
  await expect(readProviderJson('https://example.invalid/read', schema, 'Synthetic', { signal: parent.signal }))
    .rejects.toMatchObject({ code: 'timeout' });
  expect(fetch).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});
it('bounds late response-body parsing, ignores late success, and aborts the fetch signal', async () => {
  let resolveBody: (value: unknown) => void = () => {};
  const body = new Promise<unknown>(resolve => { resolveBody = resolve; });
  const response = new Response('{}');
  jest.spyOn(response, 'json').mockImplementation(() => body);
  jest.mocked(fetch).mockResolvedValue(response);
  const pending = readProviderJson('https://example.invalid/read', schema, 'Synthetic', {}, 20);
  const rejected = expect(pending).rejects.toMatchObject({ code: 'timeout' });
  await jest.advanceTimersByTimeAsync(20);
  await rejected;
  expect(jest.mocked(fetch).mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  resolveBody({ count: 99 });
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
it('redacts network exceptions', async () => {
  jest.mocked(fetch).mockRejectedValue(new Error('private-marker'));
  await expect(readProviderJson('https://example.invalid/read', schema, 'Synthetic'))
    .rejects.toThrow('Synthetic request failed');
});
