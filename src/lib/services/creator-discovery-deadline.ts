import { AsyncLocalStorage } from 'node:async_hooks';

export const CREATOR_DISCOVERY_DEADLINE_MS = 180_000;
export class CreatorDiscoveryDeadlineError extends Error {
  constructor() { super('creator_discovery_deadline_exceeded'); this.name = 'CreatorDiscoveryDeadlineError'; }
}
export class CreatorDiscoveryBudgetError extends Error {
  constructor(readonly code: 'budget_exhausted' | 'budget_unavailable') { super(code); this.name = 'CreatorDiscoveryBudgetError'; }
}
export type CreatorDiscoveryExecutionOptions = {
  readonly beforeRequest?: (urlWithoutQuery: string) => Promise<void>;
};

export type CreatorDiscoveryDeadline = {
  readonly signal: AbortSignal;
  ensure(): void;
  expired(): boolean;
};
const context = new AsyncLocalStorage<CreatorDiscoveryDeadline & CreatorDiscoveryExecutionOptions>();

/** Read-only HTTP operations inherit cancellation; legacy calls outside a run remain unchanged. */
export function creatorProviderSignal(): AbortSignal | undefined { return context.getStore()?.signal; }

/** Await the durable reservation outside any read timeout race; even a failed attempt keeps its reservation. */
export async function beforeCreatorProviderRequest(url: string): Promise<void> {
  const scope = context.getStore();
  if (!scope) return;
  scope.ensure();
  const target = new URL(url);
  try { await scope.beforeRequest?.(`${target.origin}${target.pathname}`); }
  catch (error) {
    throw new CreatorDiscoveryBudgetError(error instanceof Error && error.message === 'creator_daily_budget_exhausted'
      ? 'budget_exhausted' : 'budget_unavailable');
  }
  scope.ensure();
}

/** Never races a write: the caller awaits every started operation before this scope is disposed. */
export async function withCreatorDiscoveryDeadline<T>(operation: (deadline: CreatorDiscoveryDeadline) => Promise<T>,
  options: CreatorDiscoveryExecutionOptions = {}): Promise<T> {
  const controller = new AbortController();
  const expiresAt = Date.now() + CREATOR_DISCOVERY_DEADLINE_MS;
  const timer = setTimeout(() => controller.abort(), CREATOR_DISCOVERY_DEADLINE_MS);
  const deadline: CreatorDiscoveryDeadline = {
    signal: controller.signal,
    expired() {
      if (Date.now() >= expiresAt && !controller.signal.aborted) controller.abort();
      return controller.signal.aborted;
    },
    ensure() { if (this.expired()) throw new CreatorDiscoveryDeadlineError(); },
  };
  try { return await context.run({ ...deadline, ...options }, () => operation(deadline)); }
  finally { clearTimeout(timer); }
}
