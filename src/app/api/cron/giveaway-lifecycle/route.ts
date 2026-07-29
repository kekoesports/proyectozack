import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveaways } from '@/db/schema';
import { assertCronAuth } from '@/lib/security/assertCronAuth';

export const dynamic = 'force-dynamic';

/** Reconciliación idempotente: active vencido pasa a ended. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  const ended = await db
    .update(giveaways)
    .set({ status: 'ended', updatedAt: new Date() })
    .where(and(
      eq(giveaways.status, 'active'),
      isNotNull(giveaways.endsAt),
      lte(giveaways.endsAt, new Date()),
    ))
    .returning({ id: giveaways.id });

  return NextResponse.json({ success: true, ended: ended.length });
}
