import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

/**
 * Returns a rate limiter if Upstash is configured, otherwise `null`.
 * When `null`, callers should skip rate limiting (dev / test environments).
 *
 * Limit: 10 requests per 60 seconds per IP — applied to public tRPC mutations
 * (contact form, creator apply) to prevent spam.
 */
function makeRateLimiter(): Ratelimit | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    analytics: false,
    prefix: 'sp_rl',
  });
}

let _limiter: Ratelimit | null | undefined;

function getRateLimiter(): Ratelimit | null {
  if (_limiter === undefined) _limiter = makeRateLimiter();
  return _limiter;
}

/**
 * Check rate limit for a given identifier (IP hash or user id).
 * Returns `true` if the request is allowed, `false` if it should be blocked.
 * Always returns `true` when Upstash is not configured.
 */
export async function checkRateLimit(identifier: string): Promise<boolean> {
  const limiter = getRateLimiter();
  if (!limiter) return true;
  const { success } = await limiter.limit(identifier);
  return success;
}
