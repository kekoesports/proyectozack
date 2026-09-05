import { z } from 'zod';

export const ProviderWarning = z.enum([
  'request_failed', 'timeout', 'rate_limited', 'invalid_response',
  'coverage_incomplete', 'page_limit', 'duplicate_record', 'repeated_cursor',
  'metric_unavailable', 'budget_exhausted', 'budget_unavailable',
]);
export type ProviderWarning = z.infer<typeof ProviderWarning>;

export const ProviderCoverage = z.object({
  status: z.enum(['complete', 'partial', 'unavailable']),
  pagesRead: z.number().int().nonnegative(),
  warnings: z.array(ProviderWarning),
});
export type ProviderCoverage = z.infer<typeof ProviderCoverage>;

export const ProviderReadOptions = z.object({
  timeoutMs: z.number().int().min(1).max(30_000),
});
