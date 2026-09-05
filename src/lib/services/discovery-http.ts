import type { z } from 'zod';
import { DiscoveryHttpOptions, DiscoveryRetryAfter } from '@/lib/schemas/discovery-http';
import { beforeCreatorProviderRequest } from './creator-discovery-deadline';

export type DiscoveryErrorCode = 'invalid_input' | 'invalid_response' | 'not_configured'
  | 'unauthorized' | 'forbidden' | 'rate_limited' | 'timeout' | 'cancelled' | 'request_failed';
export class DiscoveryReadError extends Error {
  constructor(readonly code: DiscoveryErrorCode, readonly status: number | null = null,
    readonly retryAfterMs: number | null = null) {
    super(`Discovery provider: ${code}`);
    this.name = 'DiscoveryReadError';
  }
}
export type DiscoveryReadOptions = DiscoveryHttpOptions & { readonly signal?: AbortSignal };

/** An unparseable/oversized header defers work; it must not shorten the provider's cooldown. */
export function discoveryRetryDelay(value: string | null, now = Date.now()): number | null {
  const parsed = DiscoveryRetryAfter.safeParse(value);
  if (!parsed.success) return Number.POSITIVE_INFINITY;
  if (parsed.data === null) return null;
  if (/^\d+(?:\.\d+)?$/.test(parsed.data)) {
    const millis = Number(parsed.data) * 1000;
    return Number.isFinite(millis) ? millis : Number.POSITIVE_INFINITY;
  }
  if (!/^[a-zA-Z]{3}, /.test(parsed.data)) return Number.POSITIVE_INFINITY;
  const date = Date.parse(parsed.data);
  return Number.isFinite(date) ? Math.max(0, date - now) : Number.POSITIVE_INFINITY;
}

function allowed(url: string, method: string): boolean {
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.username || target.password) return false;
    if (target.origin === 'https://id.kick.com') {
      return method === 'POST' && target.pathname === '/oauth/token' && !target.search;
    }
    return method === 'GET' && (
      (target.origin === 'https://api.kick.com'
        && /^\/public\/(v2\/(categories|livestreams)|v1\/(channels|users))$/.test(target.pathname))
      || (target.origin === 'https://graph.facebook.com' && /^\/v\d+\.0\/\d+$/.test(target.pathname)));
  } catch { return false; }
}

async function pause(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new DiscoveryReadError('cancelled');
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(new DiscoveryReadError('cancelled')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

async function attempt<T>(url: string, schema: z.ZodType<T>, init: RequestInit,
  timeoutMs: number, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new DiscoveryReadError('cancelled');
  // Reserve before the read race: a durable quota write must never be abandoned in the background.
  await beforeCreatorProviderRequest(url);
  if (signal?.aborted) throw new DiscoveryReadError('cancelled');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    abort = () => { controller.abort(); reject(new DiscoveryReadError('cancelled')); };
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => { controller.abort(); reject(new DiscoveryReadError('timeout')); }, timeoutMs);
    if (signal?.aborted) abort();
  });
  try {
    const operation = Promise.resolve().then(async () => {
      if (controller.signal.aborted) throw new DiscoveryReadError('cancelled');
      const response = await fetch(url, { ...init, redirect: 'error', cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        const retryAfter = discoveryRetryDelay(response.headers.get('retry-after'));
        void response.body?.cancel().catch(() => undefined);
        const code = response.status === 429 ? 'rate_limited' : response.status === 401 ? 'unauthorized'
          : response.status === 403 ? 'forbidden' : 'request_failed';
        throw new DiscoveryReadError(code, response.status, retryAfter);
      }
      const body: unknown = await response.json();
      if (controller.signal.aborted) throw new DiscoveryReadError('cancelled');
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw new DiscoveryReadError('invalid_response');
      return parsed.data;
    });
    return await Promise.race([operation, deadline]);
  } catch (error) {
    if (error instanceof DiscoveryReadError) throw error;
    throw new DiscoveryReadError('request_failed');
  } finally {
    clearTimeout(timer);
    if (abort) signal?.removeEventListener('abort', abort);
  }
}

/** Only documented read routes (plus app-token exchange). No remote body/URL enters an error. */
export async function readDiscoveryJson<T>(url: string, schema: z.ZodType<T>,
  init: RequestInit = {}, options: DiscoveryReadOptions = {}): Promise<T> {
  const parsed = DiscoveryHttpOptions.safeParse(options);
  if (!parsed.success || !allowed(url, init.method ?? 'GET')) throw new DiscoveryReadError('invalid_input');
  const signal = options.signal ?? init.signal ?? undefined;
  for (let retry = 0; ; retry++) {
    try { return await attempt(url, schema, init, parsed.data.timeoutMs, signal); }
    catch (error) {
      if (!(error instanceof DiscoveryReadError) || error.code !== 'rate_limited'
        || retry >= parsed.data.maxRetries) throw error;
      const wait = error.retryAfterMs ?? 1000 * 2 ** retry;
      if (wait > parsed.data.maxRetryDelayMs) throw error;
      await pause(wait, signal);
    }
  }
}
