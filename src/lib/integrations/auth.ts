import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { integrationApiRateLimits } from '@/db/schema';
import { transactionalDb } from '@/lib/db';
import { env } from '@/lib/env';
import { integrationError } from './responses';

export type IntegrationAuth = {
  ok: true;
  traceId: string;
  tokenFingerprint: string;
};

export type IntegrationAuthFailure = {
  ok: false;
  response: ReturnType<typeof integrationError>;
};

function equalSecret(received: string, expected: string): boolean {
  const receivedHash = createHash('sha256').update(received).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(receivedHash, expectedHash);
}

function parseBearer(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function getTraceId(request: NextRequest): string {
  const candidate = request.headers.get('x-trace-id');
  return candidate && /^[0-9a-f-]{36}$/i.test(candidate) ? candidate : randomUUID();
}

async function consumeRateLimit(tokenFingerprint: string): Promise<boolean> {
  const now = new Date();
  const windowStartedAt = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const [row] = await transactionalDb
    .insert(integrationApiRateLimits)
    .values({ tokenFingerprint, windowStartedAt, requestCount: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: [integrationApiRateLimits.tokenFingerprint, integrationApiRateLimits.windowStartedAt],
      set: {
        requestCount: sql`${integrationApiRateLimits.requestCount} + 1`,
        updatedAt: now,
      },
    })
    .returning({ requestCount: integrationApiRateLimits.requestCount });
  return (row?.requestCount ?? env.INTEGRATION_RATE_LIMIT_PER_MINUTE + 1)
    > env.INTEGRATION_RATE_LIMIT_PER_MINUTE;
}

export async function authorizeIntegrationRequest(
  request: NextRequest,
): Promise<IntegrationAuth | IntegrationAuthFailure> {
  const traceId = getTraceId(request);
  const configuredToken = env.SOCIALPRO_INTEGRATION_TOKEN;
  if (!configuredToken) {
    return {
      ok: false,
      response: integrationError(503, 'integration_not_configured', 'Integration API is not configured', traceId),
    };
  }

  const receivedToken = parseBearer(request);
  if (!receivedToken || !equalSecret(receivedToken, configuredToken)) {
    return {
      ok: false,
      response: integrationError(401, 'unauthorized', 'Invalid integration credentials', traceId),
    };
  }

  const tokenFingerprint = createHash('sha256').update(receivedToken).digest('hex');
  if (await consumeRateLimit(tokenFingerprint)) {
    return {
      ok: false,
      response: integrationError(429, 'rate_limited', 'Integration rate limit exceeded', traceId),
    };
  }

  return { ok: true, traceId, tokenFingerprint };
}

export async function cleanExpiredIntegrationRateLimits(before: Date): Promise<number> {
  const rows = await transactionalDb
    .delete(integrationApiRateLimits)
    .where(lt(integrationApiRateLimits.updatedAt, before))
    .returning({ tokenFingerprint: integrationApiRateLimits.tokenFingerprint });
  return rows.length;
}

export async function getCurrentRateCount(
  tokenFingerprint: string,
  windowStartedAt: Date,
): Promise<number> {
  const [row] = await transactionalDb
    .select({ requestCount: integrationApiRateLimits.requestCount })
    .from(integrationApiRateLimits)
    .where(and(
      eq(integrationApiRateLimits.tokenFingerprint, tokenFingerprint),
      eq(integrationApiRateLimits.windowStartedAt, windowStartedAt),
    ))
    .limit(1);
  return row?.requestCount ?? 0;
}
