'server-only';

import { createHmac } from 'node:crypto';
import { and, asc, eq, inArray, lt, lte, sql } from 'drizzle-orm';
import {
  automationEventOutbox,
  automationWebhookDeliveries,
  integrationApiIdempotency,
} from '@/db/schema';
import { getTransactionalDb } from '@/lib/db';
import { env } from '@/lib/env';
import { cleanExpiredIntegrationRateLimits } from '@/lib/integrations/auth';

type EventPayload = Record<string, unknown>;
type OutboxWriter = Pick<ReturnType<typeof getTransactionalDb>, 'insert'>;

export type AutomationEventInput = {
  eventType: string;
  aggregateType: string;
  aggregateId: string | number;
  idempotencyKey: string;
  payload: EventPayload;
};

type ClaimedEvent = typeof automationEventOutbox.$inferSelect & { attempt: number };

export async function enqueueAutomationEvent(
  writer: OutboxWriter,
  input: AutomationEventInput,
): Promise<void> {
  await writer
    .insert(automationEventOutbox)
    .values({
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: String(input.aggregateId),
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      maxAttempts: env.OUTBOX_MAX_ATTEMPTS,
    })
    .onConflictDoNothing({ target: automationEventOutbox.idempotencyKey });
}

function retryDelayMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(24 * 60 * 60 * 1000, 60_000 * 2 ** exponent);
}

function responseMetadata(response: Response, text: string): Record<string, unknown> {
  const sanitized = text
    .slice(0, 500)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/(bearer|token|secret|password)["'\s:=]+[^\s,"'}]+/gi, '$1=[redacted]');
  return {
    contentType: response.headers.get('content-type')?.slice(0, 100) ?? null,
    bodySnippet: sanitized || null,
  };
}

async function recoverStuckEvents(now: Date): Promise<number> {
  const transactionalDb = getTransactionalDb();
  const cutoff = new Date(now.getTime() - Math.max(env.OUTBOX_TIMEOUT_MS * 3, 60_000));
  const rows = await transactionalDb
    .update(automationEventOutbox)
    .set({
      status: 'failed',
      lockedAt: null,
      nextAttemptAt: now,
      lastErrorCode: 'stale_processing_lock',
      updatedAt: now,
    })
    .where(and(
      eq(automationEventOutbox.status, 'processing'),
      lt(automationEventOutbox.lockedAt, cutoff),
    ))
    .returning({ id: automationEventOutbox.id });
  return rows.length;
}

async function claimEvents(now: Date): Promise<ClaimedEvent[]> {
  const transactionalDb = getTransactionalDb();
  return transactionalDb.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(automationEventOutbox)
      .where(and(
        inArray(automationEventOutbox.status, ['pending', 'failed']),
        lte(automationEventOutbox.nextAttemptAt, now),
      ))
      .orderBy(asc(automationEventOutbox.createdAt))
      .limit(env.OUTBOX_BATCH_SIZE)
      .for('update', { skipLocked: true });

    if (rows.length === 0) return [];
    await tx
      .update(automationEventOutbox)
      .set({
        status: 'processing',
        attempts: sql`${automationEventOutbox.attempts} + 1`,
        lockedAt: now,
        updatedAt: now,
      })
      .where(inArray(automationEventOutbox.id, rows.map((row) => row.id)));

    return rows.map((row) => ({ ...row, attempt: row.attempts + 1 }));
  });
}

async function recordSuccess(event: ClaimedEvent, response: Response, durationMs: number): Promise<void> {
  const transactionalDb = getTransactionalDb();
  const bodyText = await response.text();
  const now = new Date();
  await transactionalDb.transaction(async (tx) => {
    await tx.insert(automationWebhookDeliveries).values({
      eventId: event.id,
      attempt: event.attempt,
      outcome: 'delivered',
      statusCode: response.status,
      durationMs,
      responseMeta: responseMetadata(response, bodyText),
    });
    await tx
      .update(automationEventOutbox)
      .set({
        status: 'delivered',
        deliveredAt: now,
        lockedAt: null,
        lastErrorCode: null,
        lastResponseMeta: responseMetadata(response, bodyText),
        updatedAt: now,
      })
      .where(eq(automationEventOutbox.id, event.id));
  });
}

async function recordFailure(
  event: ClaimedEvent,
  errorCode: string,
  durationMs: number,
  response?: Response,
  bodyText = '',
): Promise<void> {
  const transactionalDb = getTransactionalDb();
  const now = new Date();
  const deadLetter = event.attempt >= event.maxAttempts;
  const metadata = response ? responseMetadata(response, bodyText) : { bodySnippet: null };
  await transactionalDb.transaction(async (tx) => {
    await tx.insert(automationWebhookDeliveries).values({
      eventId: event.id,
      attempt: event.attempt,
      outcome: deadLetter ? 'dead_letter' : 'failed',
      statusCode: response?.status ?? null,
      durationMs,
      responseMeta: metadata,
    });
    await tx
      .update(automationEventOutbox)
      .set({
        status: deadLetter ? 'dead_letter' : 'failed',
        lockedAt: null,
        nextAttemptAt: new Date(now.getTime() + retryDelayMs(event.attempt)),
        lastErrorCode: errorCode.slice(0, 80),
        lastResponseMeta: metadata,
        updatedAt: now,
      })
      .where(eq(automationEventOutbox.id, event.id));
  });
}

async function deliverEvent(event: ClaimedEvent, url: string, secret: string): Promise<boolean> {
  const body = JSON.stringify({
    id: event.id,
    traceId: event.traceId,
    type: event.eventType,
    aggregate: { type: event.aggregateType, id: event.aggregateId },
    occurredAt: event.createdAt.toISOString(),
    payload: event.payload,
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-socialpro-signature': `sha256=${signature}`,
        'x-socialpro-timestamp': timestamp,
        'x-event-id': event.id,
        'idempotency-key': event.idempotencyKey,
      },
      body,
      signal: AbortSignal.timeout(env.OUTBOX_TIMEOUT_MS),
    });
    const durationMs = Date.now() - startedAt;
    if (response.ok) {
      await recordSuccess(event, response, durationMs);
      return true;
    }
    const responseBody = await response.text();
    await recordFailure(event, `http_${response.status}`, durationMs, response, responseBody);
  } catch (error) {
    const code = error instanceof Error && error.name === 'TimeoutError'
      ? 'webhook_timeout'
      : 'webhook_network_error';
    await recordFailure(event, code, Date.now() - startedAt);
  }
  return false;
}

export type DispatchResult = {
  configured: boolean;
  claimed: number;
  delivered: number;
  failed: number;
  recovered: number;
  cleaned: number;
};

export async function dispatchAutomationEvents(): Promise<DispatchResult> {
  const url = env.N8N_AUTOMATION_WEBHOOK_URL;
  const secret = env.AUTOMATION_WEBHOOK_SECRET;
  if (!url || !secret) {
    return { configured: false, claimed: 0, delivered: 0, failed: 0, recovered: 0, cleaned: 0 };
  }
  const transactionalDb = getTransactionalDb();

  const now = new Date();
  const recovered = await recoverStuckEvents(now);
  const claimed = await claimEvents(now);
  const outcomes = await Promise.all(claimed.map((event) => deliverEvent(event, url, secret)));
  const delivered = outcomes.filter(Boolean).length;
  const cleanupBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const [cleanedRateLimits, cleanedIdempotency] = await Promise.all([
    cleanExpiredIntegrationRateLimits(cleanupBefore),
    transactionalDb
      .delete(integrationApiIdempotency)
      .where(lt(integrationApiIdempotency.expiresAt, now))
      .returning({ key: integrationApiIdempotency.key })
      .then((rows) => rows.length),
  ]);
  return {
    configured: true,
    claimed: claimed.length,
    delivered,
    failed: claimed.length - delivered,
    recovered,
    cleaned: cleanedRateLimits + cleanedIdempotency,
  };
}

export async function retryOutboxEvent(id: string): Promise<boolean> {
  const transactionalDb = getTransactionalDb();
  const [row] = await transactionalDb
    .update(automationEventOutbox)
    .set({
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(),
      lockedAt: null,
      deliveredAt: null,
      lastErrorCode: null,
      updatedAt: new Date(),
    })
    .where(eq(automationEventOutbox.id, id))
    .returning({ id: automationEventOutbox.id });
  return row !== undefined;
}
