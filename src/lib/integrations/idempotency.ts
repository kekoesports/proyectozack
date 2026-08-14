import { createHash } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { integrationApiIdempotency } from '@/db/schema';
import { getTransactionalDb } from '@/lib/db';
import { integrationError } from './responses';

type MutationResult = {
  status: number;
  body: Record<string, unknown>;
};

type IdempotentMutationArgs<T> = {
  request: NextRequest;
  route: string;
  input: T;
  traceId: string;
  execute: () => Promise<MutationResult>;
};

function requestHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function replay(body: Record<string, unknown>, statusCode: number): NextResponse {
  return NextResponse.json(body, { status: statusCode, headers: { 'x-idempotent-replay': 'true' } });
}

export async function runIdempotentMutation<T>(
  args: IdempotentMutationArgs<T>,
): Promise<NextResponse> {
  const key = args.request.headers.get('idempotency-key')?.trim();
  if (!key || key.length < 8 || key.length > 200) {
    return integrationError(
      400,
      'idempotency_required',
      'A valid Idempotency-Key header is required',
      args.traceId,
    );
  }

  const hash = requestHash(args.input);
  const transactionalDb = getTransactionalDb();
  const now = new Date();
  const existing = await transactionalDb
    .select()
    .from(integrationApiIdempotency)
    .where(and(eq(integrationApiIdempotency.key, key), gt(integrationApiIdempotency.expiresAt, now)))
    .limit(1);
  const prior = existing[0];
  if (prior) {
    if (prior.route !== args.route || prior.requestHash !== hash) {
      return integrationError(
        409,
        'idempotency_conflict',
        'Idempotency key was already used for another request',
        args.traceId,
      );
    }
    return replay(prior.responseBody, prior.statusCode);
  }

  // An expired row must not reserve its key forever if periodic cleanup has
  // not run yet. Concurrent deletes/inserts remain safe through the PK.
  await transactionalDb
    .delete(integrationApiIdempotency)
    .where(and(
      eq(integrationApiIdempotency.key, key),
      lte(integrationApiIdempotency.expiresAt, now),
    ));

  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const reservation = await transactionalDb
    .insert(integrationApiIdempotency)
    .values({
      key,
      route: args.route,
      requestHash: hash,
      statusCode: 409,
      responseBody: { ok: false, error: { code: 'conflict', message: 'Request is already processing' } },
      expiresAt,
    })
    .onConflictDoNothing()
    .returning({ key: integrationApiIdempotency.key });

  if (reservation.length === 0) {
    return integrationError(409, 'conflict', 'Request is already processing', args.traceId);
  }

  try {
    const result = await args.execute();
    await transactionalDb
      .update(integrationApiIdempotency)
      .set({ statusCode: result.status, responseBody: result.body })
      .where(eq(integrationApiIdempotency.key, key));
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    const body = {
      ok: false,
      error: { code: 'internal_error', message: 'Integration mutation failed' },
      traceId: args.traceId,
    };
    await transactionalDb
      .update(integrationApiIdempotency)
      .set({ statusCode: 500, responseBody: body })
      .where(eq(integrationApiIdempotency.key, key));
    return NextResponse.json(body, { status: 500 });
  }
}
