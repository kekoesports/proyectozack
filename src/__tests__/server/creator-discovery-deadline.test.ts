import { z } from 'zod';
import { withCreatorDiscoveryDeadline, creatorProviderSignal, beforeCreatorProviderRequest, CREATOR_DISCOVERY_DEADLINE_MS } from '@/lib/services/creator-discovery-deadline';
import { readProviderJson } from '@/lib/services/provider-http';
import { readDiscoveryJson } from '@/lib/services/discovery-http';

const schema = z.object({ total: z.number() });
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-05T12:00:00Z'));
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected synthetic request'));
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('cleans the scope timer after success and never leaks its signal into unrelated requests', async () => {
  expect(creatorProviderSignal()).toBeUndefined();
  expect(await withCreatorDiscoveryDeadline(async scope => {
    expect(creatorProviderSignal()).toBe(scope.signal); return 42;
  })).toBe(42);
  expect(creatorProviderSignal()).toBeUndefined(); expect(jest.getTimerCount()).toBe(0);
});
it('refuses a new request after the run deadline without consuming another reservation', async () => {
  const reserve = jest.fn(async () => undefined);
  await withCreatorDiscoveryDeadline(async () => {
    jest.advanceTimersByTime(CREATOR_DISCOVERY_DEADLINE_MS);
    await expect(readProviderJson('https://example.com/read', schema, 'Synthetic')).rejects.toThrow('creator_discovery_deadline_exceeded');
  }, { beforeRequest: reserve });
  expect(fetch).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
});
it('passes the global deadline to an in-flight fetch rather than only bounding loop iterations', async () => {
  let signal: AbortSignal | null | undefined;
  jest.mocked(fetch).mockImplementation(async (_url, init) => {
    signal = init?.signal;
    return new Promise<Response>((_, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  });
  const pending = withCreatorDiscoveryDeadline(async () => {
    jest.advanceTimersByTime(CREATOR_DISCOVERY_DEADLINE_MS - 1000);
    return readProviderJson('https://example.com/read', schema, 'Synthetic');
  });
  const rejected = expect(pending).rejects.toThrow('aborted');
  await jest.advanceTimersByTimeAsync(1000);
  await rejected;
  expect(signal?.aborted).toBe(true); expect(fetch).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
it('ignores a late read body after cancellation and does not continue to the next operation', async () => {
  let resolveBody: ((value: unknown) => void) | undefined;
  const response = new Response('{}');
  jest.spyOn(response, 'json').mockImplementation(() => new Promise(resolve => { resolveBody = resolve; }));
  jest.mocked(fetch).mockResolvedValue(response);
  const next = jest.fn();
  const pending = withCreatorDiscoveryDeadline(async () => {
    jest.advanceTimersByTime(CREATOR_DISCOVERY_DEADLINE_MS - 1000);
    await readProviderJson('https://example.com/read', schema, 'Synthetic'); next();
  });
  const rejected = expect(pending).rejects.toThrow('aborted');
  await jest.advanceTimersByTimeAsync(1000); await rejected;
  resolveBody?.({ total: 999 }); await Promise.resolve();
  expect(next).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(1);
});
it('reserves only a query-free route and blocks network when the durable budget is exhausted', async () => {
  const reserve = jest.fn(async () => { throw new Error('creator_daily_budget_exhausted'); });
  await expect(withCreatorDiscoveryDeadline(() => readProviderJson(
    'https://www.googleapis.com/youtube/v3/search?key=synthetic-secret&q=private-marker', schema, 'Synthetic',
  ), { beforeRequest: reserve })).rejects.toThrow('budget_exhausted');
  expect(reserve).toHaveBeenCalledWith('https://www.googleapis.com/youtube/v3/search');
  expect(fetch).not.toHaveBeenCalled();
});
it('redacts an unexpected reservation failure and does not send the request', async () => {
  await expect(withCreatorDiscoveryDeadline(() => readProviderJson('https://example.com/read', schema, 'Synthetic'), {
    beforeRequest: async () => { throw new Error('private database marker'); },
  })).rejects.toThrow('budget_unavailable');
  expect(fetch).not.toHaveBeenCalled();
});
it('awaits a started reservation beyond cancellation rather than racing a durable write', async () => {
  let release: (() => void) | undefined;
  let started: (() => void) | undefined;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const reserve = jest.fn(() => new Promise<void>(resolve => { release = resolve; started?.(); }));
  let settled = false;
  const pending = withCreatorDiscoveryDeadline(() => readProviderJson('https://example.com/read', schema, 'Synthetic'), { beforeRequest: reserve })
    .finally(() => { settled = true; });
  const rejected = expect(pending).rejects.toThrow('creator_discovery_deadline_exceeded');
  await entered; await jest.advanceTimersByTimeAsync(CREATOR_DISCOVERY_DEADLINE_MS);
  expect(settled).toBe(false); expect(fetch).not.toHaveBeenCalled();
  release?.(); await rejected; expect(fetch).not.toHaveBeenCalled();
});
it('reserves every Kick HTTP attempt, including a permitted rate-limit retry', async () => {
  const reserve = jest.fn(async () => undefined);
  jest.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '0' } }))
    .mockResolvedValueOnce(new Response('{"total":0}'));
  const pending = withCreatorDiscoveryDeadline(() => readDiscoveryJson(
    'https://api.kick.com/public/v2/categories?name=Synthetic', schema, {}, { maxRetries: 1 },
  ), { beforeRequest: reserve });
  await jest.advanceTimersByTimeAsync(1);
  expect(await pending).toEqual({ total: 0 });
  expect(fetch).toHaveBeenCalledTimes(2); expect(reserve).toHaveBeenCalledTimes(2);
  expect(reserve).toHaveBeenNthCalledWith(2, 'https://api.kick.com/public/v2/categories');
});
it('does not reserve an already-aborted caller request', async () => {
  const controller = new AbortController(); controller.abort();
  const reserve = jest.fn(async () => undefined);
  await expect(withCreatorDiscoveryDeadline(() => readProviderJson('https://example.com/read', schema, 'Synthetic', {
    signal: controller.signal,
  }), { beforeRequest: reserve })).rejects.toThrow('aborted');
  expect(reserve).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('exposes a safe hook outside a discovery scope without creating hidden background work', async () => {
  await expect(beforeCreatorProviderRequest('https://example.com/read')).resolves.toBeUndefined();
  expect(fetch).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
});
