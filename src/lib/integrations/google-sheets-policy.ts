/** HTTP admission is shared by Sheets consumers in this Node process only. */
export const SHEETS_REQUEST_GAP_MS = 1_500;
export const SHEETS_READ_BUDGET_MS = 45_000;
const QUOTA_COOLDOWN_MS = 60_000;

export type SheetsReadOptions = { readonly deadlineAt?: number };

export class SheetsDeadlineError extends Error {
  constructor() {
    super('Lectura de Google Sheets diferida: no queda tiempo para respetar la espera y completar la petición.');
    this.name = 'SheetsDeadlineError';
  }
}

export class SheetsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'SheetsApiError';
  }
}

export function assertSheetsBudget(deadlineAt: number, timeoutMs = 0): void {
  if (Date.now() + timeoutMs >= deadlineAt) throw new SheetsDeadlineError();
}

export function sheetsRetryFloorMs(retryAfterSeconds: number | null): number {
  return retryAfterSeconds === null ? QUOTA_COOLDOWN_MS : retryAfterSeconds * 1000;
}

type Admission = {
  readonly deadlineAt: number;
  readonly timeoutMs: number;
  readonly start: () => void;
  readonly reject: (error: SheetsDeadlineError) => void;
};

function createSheetsAdmission() {
  let queue: Admission[] = [];
  let nextStartAt = 0;
  let cooldownUntil = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function pump(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    const now = Date.now();
    const earliestStart = Math.max(now, nextStartAt, cooldownUntil);
    // Expire every impossible request, including those behind a longer-lived
    // consumer. A cooldown must not make a caller wait past its own deadline.
    queue = queue.filter((entry) => {
      if (earliestStart + entry.timeoutMs < entry.deadlineAt) return true;
      entry.reject(new SheetsDeadlineError());
      return false;
    });
    if (queue.length === 0) return;
    if (earliestStart <= now) {
      const entry = queue.shift();
      if (entry) {
        nextStartAt = now + SHEETS_REQUEST_GAP_MS;
        entry.start();
      }
      pump();
      return;
    }
    const expiry = Math.min(...queue.map((entry) => entry.deadlineAt - entry.timeoutMs));
    timer = setTimeout(pump, Math.min(earliestStart, expiry) - now);
  }

  return {
    run<T>(fn: () => Promise<T>, timeoutMs: number, deadlineAt: number): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({
          deadlineAt,
          timeoutMs,
          reject,
          start: () => {
            // Invoke inside the admission turn, before releasing the next slot.
            try { resolve(fn()); } catch (error) { reject(error); }
          },
        });
        pump();
      });
    },
    cooldown(retryAfterSeconds: number | null): void {
      cooldownUntil = Math.max(cooldownUntil, Date.now() + sheetsRetryFloorMs(retryAfterSeconds));
      // Recheck requests already queued; no future slots are pre-reserved.
      pump();
    },
  };
}

declare global {
  // Next can load this module from more than one server bundle. Preserve a
  // single admission queue across those copies, without sharing credentials.
  var socialProSheetsAdmission: ReturnType<typeof createSheetsAdmission> | undefined;
}

export const sheetsAdmission = globalThis.socialProSheetsAdmission ??= createSheetsAdmission();

/** Only HTTP 429 is retried, at most three times including the first request. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxAttempts?: number;
    baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
    deadlineAt?: number;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const maxAttempts = Math.min(opts.maxAttempts ?? 3, 3);
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 1; ; attempt++) {
    if (opts.deadlineAt !== undefined) assertSheetsBudget(opts.deadlineAt, opts.timeoutMs ?? 0);
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof SheetsApiError) || error.status !== 429 || attempt >= maxAttempts) throw error;
      const exponential = (opts.baseDelayMs ?? 1000) * Math.pow(2, attempt - 1);
      const floor = Math.max(exponential, sheetsRetryFloorMs(error.retryAfterSeconds));
      // Jitter can delay a retry, never shorten the provider's lower bound.
      const waitMs = Math.ceil(floor + exponential * Math.random() * 0.2);
      if (opts.deadlineAt !== undefined) {
        assertSheetsBudget(opts.deadlineAt, waitMs + (opts.timeoutMs ?? 0));
      }
      await sleep(waitMs);
    }
  }
}
