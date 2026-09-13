import { and, eq, sql } from 'drizzle-orm';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { intakeConversations } from '@/db/schema/creatorIntake';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import { IntakeWhatsAppUpdate, IntakeWhatsAppVerification } from '@/lib/schemas/intakeWhatsApp';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';
import { readWhatsAppBytes, verifyWhatsAppSignature } from '@/lib/intake/whatsapp-signature';
import { normalizeWhatsAppIntake } from '@/lib/intake/whatsapp-normalize';
import { extractCreatorIntake } from '@/lib/intake/extractor';
import { deliverIntake } from '@/lib/intake/delivery';
import { sendIntakeWhatsApp } from '@/lib/intake/whatsapp-send';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const token = env.CREATOR_INTAKE_WHATSAPP_VERIFY_TOKEN;
  if (!token) return new Response(null, { status: 503 });
  const parsed = IntakeWhatsAppVerification.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success || !timingSafeEqual(parsed.data['hub.verify_token'], token)) return new Response(null, { status: 403 });
  return new Response(parsed.data['hub.challenge'], { headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(request: Request): Promise<Response> {
  const secret = env.CREATOR_INTAKE_WHATSAPP_APP_SECRET;
  const waba = env.CREATOR_INTAKE_WHATSAPP_WABA;
  const phoneId = env.CREATOR_INTAKE_WHATSAPP_PHONE_ID;
  const phone = env.CREATOR_INTAKE_WHATSAPP_PHONE;
  const chats = env.CREATOR_INTAKE_WHATSAPP_CHATS;
  const startAt = env.CREATOR_INTAKE_START_AT;
  if (!env.CREATOR_INTAKE_ENABLED || !env.CREATOR_INTAKE_WHATSAPP_ENABLED
    || !secret || !waba || !phoneId || !phone || !chats || !startAt) return Response.json({ ok: false }, { status: 503 });
  const bytes = await readWhatsAppBytes(request);
  if (!bytes) return Response.json({ ok: false }, { status: 413 });
  if (!verifyWhatsAppSignature(bytes, request.headers.get('x-hub-signature-256'), secret)) return Response.json({ ok: false }, { status: 401 });
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const parsed = IntakeWhatsAppUpdate.safeParse(raw);
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  try {
    const disconnected = parsed.data.entry.some((entry) => entry.id === waba && entry.changes.some((change) =>
      change.field === 'account_update' && ['PARTNER_REMOVED', 'ACCOUNT_OFFBOARDED'].includes(change.value.event ?? '')));
    if (disconnected) {
      await db.update(intakeConversations).set({ state: 'waiting_human', reason: 'connection_disabled',
        version: sql`${intakeConversations.version} + 1`, updatedAt: new Date() }).where(and(
        eq(intakeConversations.channel, 'whatsapp'), eq(intakeConversations.accountId, phoneId), eq(intakeConversations.state, 'bot'),
      ));
      return Response.json({ ok: true });
    }
    const events = normalizeWhatsAppIntake(parsed.data, { waba, phoneId, phone, chats: chats.split(','), startAt, now: new Date() });
    const conversations = new Set<string>();
    // Persist the complete batch (owner first) before any automated effect.
    for (const event of events) {
      const result = await creatorIntake.ingest(event, extractCreatorIntake);
      conversations.add(result.id);
    }
    if (env.CREATOR_INTAKE_SEND_ENABLED) {
      for (const id of conversations) await deliverIntake(db, id, sendIntakeWhatsApp, new Date(startAt), 'whatsapp');
    }
    return Response.json({ ok: true, ignored: events.length === 0 });
  } catch { return Response.json({ ok: false, error: 'processing-failed' }, { status: 500 }); }
}
