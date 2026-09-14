import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import type { IntakeWahaUpdate } from '@/lib/schemas/intakeWaha';
import { normalizeWahaIntake } from '@/lib/intake/waha-normalize';
import { extractCreatorIntake } from '@/lib/intake/extractor';
import { deliverIntake } from '@/lib/intake/delivery';
import { sendIntakeWaha } from '@/lib/intake/waha-send';
import { resolveWahaPeer } from '@/lib/intake/waha-peer';
import { captureWhatsAppContact, normalizeContactCapture } from '@/lib/intake/contact-capture';
import { contactCaptureConfig } from '@/lib/intake/contact-capture-config';
import { ensureWahaIdentity } from '@/lib/intake/identity';

/** Only the private worker consumes durable, authenticated inbox entries. */
export async function processWahaUpdate(update: IntakeWahaUpdate): Promise<Response> {
  const session = env.CREATOR_INTAKE_WAHA_SESSION;
  const phone = env.CREATOR_INTAKE_WHATSAPP_PHONE;
  const chats = env.CREATOR_INTAKE_WHATSAPP_CHATS;
  const startAt = env.CREATOR_INTAKE_WAHA_START_AT;
  if (!env.CREATOR_INTAKE_ENABLED || !env.CREATOR_INTAKE_WAHA_ENABLED
    || !session || !phone || !chats || !startAt) return Response.json({ ok: false }, { status: 503 });
  try {
    const resolved = await resolveWahaPeer(update);
    const event = normalizeWahaIntake(resolved, { session, phone, chats: chats.split(','), startAt, now: new Date(),
      replyToInbound: env.CREATOR_INTAKE_WAHA_REPLY_TO_INBOUND,
      ...(env.CREATOR_INTAKE_WAHA_RUN ? { run: env.CREATOR_INTAKE_WAHA_RUN } : {}),
    });
    if (!event) {
      if (!contactCaptureConfig.enabled) return Response.json({ ok: true, ignored: true });
      const captureConfig = { session, phone, startAt: contactCaptureConfig.startAt,
        now: new Date(), excludedChats: chats.split(',') };
      if (!normalizeContactCapture(resolved, captureConfig)) return Response.json({ ok: true, ignored: true, reason: 'out-of-scope' });
      await ensureWahaIdentity(db, update, resolved, phone, false);
      const capture = await captureWhatsAppContact(db, resolved, captureConfig);
      return Response.json({ ok: true, ignored: !capture.captured, reason: capture.captured ? 'human-review' : 'out-of-scope', ...capture });
    }
    const identity = await ensureWahaIdentity(db, update, resolved, phone, true);
    // General reception must not create bot conversations from unsolicited company outbounds.
    if (!identity) return Response.json({ ok: true, ignored: true, reason: 'no-inbound-contact' });
    const result = await creatorIntake.ingest(event, extractCreatorIntake);
    if (env.CREATOR_INTAKE_SEND_ENABLED) await deliverIntake(db, result.id, sendIntakeWaha, new Date(startAt), 'whatsapp');
    return Response.json({ ok: true, duplicate: result.duplicate, conversationId: result.id });
  } catch {
    return Response.json({ ok: false, error: 'processing-failed' }, { status: 500 });
  }
}
