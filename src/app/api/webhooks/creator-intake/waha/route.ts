import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { IntakeWahaUpdate, IntakeWahaMessage } from '@/lib/schemas/intakeWaha';
import { timingSafeEqual } from '@/lib/security/timingSafeEqual';
import { readIntakeBody } from '@/lib/intake/request-body';
import { enqueueWaha } from '@/lib/intake/inbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const secret = env.CREATOR_INTAKE_WAHA_SECRET;
  const session = env.CREATOR_INTAKE_WAHA_SESSION;
  const phone = env.CREATOR_INTAKE_WHATSAPP_PHONE;
  const chats = env.CREATOR_INTAKE_WHATSAPP_CHATS;
  const startAt = env.CREATOR_INTAKE_WAHA_START_AT;
  if (!env.CREATOR_INTAKE_ENABLED || !env.CREATOR_INTAKE_WAHA_ENABLED
    || !secret || !session || !phone || !chats || !startAt) return Response.json({ ok: false }, { status: 503 });
  // Dedicated transport secret, sent as WAHA customHeaders on the private network.
  const header = request.headers.get('x-socialpro-waha-secret');
  if (!header || !timingSafeEqual(header, secret)) return Response.json({ ok: false }, { status: 401 });
  const body = await readIntakeBody(request);
  if (!body.ok) return Response.json({ ok: false }, { status: body.status });
  const parsed = IntakeWahaUpdate.safeParse(body.value);
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  if (parsed.data.event !== 'message.any' || parsed.data.session !== session
    || parsed.data.me?.id !== `${phone}@c.us`) return Response.json({ ok: true, ignored: true, reason: 'unrelated-event' });
  const message = IntakeWahaMessage.safeParse(parsed.data.payload);
  if (!message.success) return Response.json({ ok: false }, { status: 400 });
  const peer = message.data.fromMe ? message.data.to ?? message.data.from : message.data.from;
  const age = Date.now() - message.data.timestamp * 1000;
  if (!/^\d+@(c\.us|lid)$/.test(peer) || peer === `${phone}@c.us`
    || message.data.timestamp * 1000 < Date.parse(startAt) || age < -60_000
    || (!message.data.body?.trim() && !message.data.hasMedia)) {
    return Response.json({ ok: true, ignored: true, reason: 'outside-current-private-messages' });
  }
  try {
    const result = await enqueueWaha(db, parsed.data);
    return Response.json(result, { status: result.ok ? 202 : 409 });
  } catch {
    return Response.json({ ok: false, error: 'inbox-unavailable' }, { status: 503 });
  }
}
