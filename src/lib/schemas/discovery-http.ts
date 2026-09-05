import { z } from 'zod';

export const DiscoveryHttpOptions = z.object({
  timeoutMs: z.number().int().min(1).max(30_000).default(10_000),
  maxRetries: z.number().int().min(0).max(2).default(2),
  maxRetryDelayMs: z.number().int().min(0).max(30_000).default(5_000),
});
export type DiscoveryHttpOptions = z.input<typeof DiscoveryHttpOptions>;
export const DiscoveryRetryAfter = z.string().trim().min(1).max(128).nullable();
