import { NextRequest, NextResponse } from 'next/server';

/* -------------------------------------------------------------------------- */
/*  In-memory sliding-window rate limiter (per-IP, per-route bucket)          */
/*  Resets on deploy / cold start — acceptable for Vercel serverless.         */
/* -------------------------------------------------------------------------- */

type Bucket = {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Evict stale entries every 60s to bound memory
const EVICT_INTERVAL = 60_000;
let lastEvict = Date.now();

function evictStale(now: number) {
  if (now - lastEvict < EVICT_INTERVAL) return;
  lastEvict = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  evictStale(now);

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

/* ---------- Route-specific limits ----------------------------------------- */
// Auth endpoints: 10 requests / 15 min per IP (brute-force protection)
// Public form endpoints: 5 requests / min per IP (spam protection)

const RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth\/sign-in/, limit: 10, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/auth\/sign-up/, limit: 5,  windowMs: 60 * 60 * 1000 },
  { pattern: /^\/api\/auth\/forget-password/, limit: 5, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/contact$/,      limit: 5,  windowMs: 60 * 1000 },
  { pattern: /^\/api\/creator-apply$/,limit: 3,  windowMs: 60 * 1000 },
];

function getClientIp(req: NextRequest): string {
  // Prefer Vercel's trusted header (cannot be spoofed by clients)
  return (
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) {
      const ip = getClientIp(req);
      const key = `${ip}:${rule.pattern.source}`;

      if (isRateLimited(key, rule.limit, rule.windowMs)) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
