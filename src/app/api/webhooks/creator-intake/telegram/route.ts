import { and, eq, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { intakeConversations } from '@/db/schema/creatorIntake';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import { IntakeTelegramHeader, IntakeTelegramUpdate } from '@/lib/schemas/intakeTelegram';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';
import { normalizeTelegramIntake } from '@/lib/intake/telegram-normalize';
import { extractCreatorIntake } from '@/lib/intake/extractor';
import { deliverIntake } from '@/lib/intake/delivery';
import { sendIntakeTelegram } from '@/lib/intake/telegram-send';
import { readIntakeBody } from '@/lib/intake/request-body';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  // Provider webhook authenticates with its dedicated Telegram secret, never a CRM session bypass.
  const secret = env.CREATOR_INTAKE_TELEGRAM_SECRET;
  const connection = env.CREATOR_INTAKE_TELEGRAM_CONNECTION;
  const owner = env.CREATOR_INTAKE_TELEGRAM_OWNER;
  const startAt = env.CREATOR_INTAKE_START_AT;
  const chats = env.CREATOR_INTAKE_TELEGRAM_CHATS;
  if (!env.CREATOR_INTAKE_ENABLED || !secret || !connection || !owner || !startAt || !chats) {
    return Response.json({ ok: false, error: 'not-configured' }, { status: 503 });
  }
  const header = IntakeTelegramHeader.safeParse(request.headers.get('x-telegram-bot-api-secret-token'));
  if (!header.success || !timingSafeEqual(header.data, secret)) return Response.json({ ok: false }, { status: 401 });
  const body = await readIntakeBody(request);
  if (!body.ok) return Response.json({ ok: false }, { status: body.status });
  const parsed = IntakeTelegramUpdate.safeParse(body.value);
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  try {
    if (parsed.data.business_connection?.id === connection && !parsed.data.business_connection.is_enabled) {
      await db.update(intakeConversations).set({ state: 'waiting_human', reason: 'connection_disabled',
        version: sql`${intakeConversations.version} + 1`, updatedAt: new Date() }).where(and(
        eq(intakeConversations.channel, 'telegram'), eq(intakeConversations.accountId, connection), eq(intakeConversations.state, 'bot'),
      ));
    }
    const event = normalizeTelegramIntake(parsed.data, { connection, owner, chats: chats.split(','), startAt, now: new Date() });
    if (!event) return Response.json({ ok: true, ignored: true });
    const result = await creatorIntake.ingest(event, extractCreatorIntake);
    if (env.CREATOR_INTAKE_SEND_ENABLED) await deliverIntake(db, result.id, sendIntakeTelegram, new Date(startAt));
    return Response.json({ ok: true, duplicate: result.duplicate });
  } catch (error: unknown) {
    return Response.json({ ok: false, error: error instanceof TRPCError && error.code === 'CONFLICT' ? 'conflict' : 'processing-failed' },
      { status: error instanceof TRPCError && error.code === 'CONFLICT' ? 409 : 500 });
  }
}
