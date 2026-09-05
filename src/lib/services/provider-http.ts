import { z } from 'zod';
import { ProviderReadOptions, type ProviderWarning } from '@/lib/schemas/provider-availability';
import { creatorProviderSignal, beforeCreatorProviderRequest, CreatorDiscoveryBudgetError, CreatorDiscoveryDeadlineError } from './creator-discovery-deadline';

/** Stable, safe errors: never include request URLs, credentials or remote bodies. */
export class ProviderReadError extends Error {
  constructor(readonly code: ProviderWarning, message: string, readonly httpStatus?: number) {
    super(message);
    this.name = 'ProviderReadError';
  }
}

export function providerWarning(error: unknown): ProviderWarning {
  if (error instanceof CreatorDiscoveryBudgetError) return error.code;
  if (error instanceof CreatorDiscoveryDeadlineError) return 'timeout';
  return error instanceof ProviderReadError ? error.code : 'request_failed';
}

/** Bounds fetch AND body parsing; no automatic retries or remote error logging. */
export async function readProviderJson<T>(
  url: string, schema: z.ZodType<T>, label: string,
  init: RequestInit = {}, timeoutMs = 10_000,
): Promise<T> {
  const options = ProviderReadOptions.safeParse({ timeoutMs });
  if (!options.success) throw new ProviderReadError('invalid_response', 'Invalid provider timeout');
  if (init.signal?.aborted) throw new ProviderReadError('timeout', `${label} request aborted`);
  // This callback may write a reservation. Await it before any Promise.race or HTTP timer.
  await beforeCreatorProviderRequest(url);
  const controller = new AbortController();
  const callerSignal = init.signal;
  const deadlineSignal = creatorProviderSignal();
  const upstream = callerSignal && deadlineSignal ? AbortSignal.any([callerSignal, deadlineSignal])
    : callerSignal ?? deadlineSignal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(new ProviderReadError('timeout', `${label} request aborted`));
    };
    upstream?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(onAbort, options.data.timeoutMs);
    if (upstream?.aborted) onAbort();
  });
  try {
    const operation = Promise.resolve().then(async () => {
      if (controller.signal.aborted) throw new ProviderReadError('timeout', `${label} request aborted`);
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        throw new ProviderReadError(response.status === 429 ? 'rate_limited' : 'request_failed',
          `${label} error (${response.status})`, response.status);
      }
      const raw: unknown = await response.json();
      if (controller.signal.aborted) throw new ProviderReadError('timeout', `${label} request aborted`);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw new ProviderReadError('invalid_response', `${label} coverage invalid`);
      return parsed.data;
    });
    return await Promise.race([operation, aborted]);
  } catch (error) {
    if (error instanceof ProviderReadError) throw error;
    throw new ProviderReadError('request_failed', `${label} request failed`);
  } finally {
    clearTimeout(timer);
    if (onAbort) upstream?.removeEventListener('abort', onAbort);
  }
}
