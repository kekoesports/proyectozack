import 'server-only';
import { env } from '@/lib/env';
import { IntakeWahaLid, IntakeWahaMessage, type IntakeWahaUpdate } from '@/lib/schemas/intakeWaha';

/** Resolve the exact incoming LID with the authenticated provider, never by guessing. */
export async function resolveWahaPeer(update: IntakeWahaUpdate): Promise<IntakeWahaUpdate> {
  const base = env.CREATOR_INTAKE_WAHA_URL;
  const key = env.CREATOR_INTAKE_WAHA_KEY;
  const session = env.CREATOR_INTAKE_WAHA_SESSION;
  if (!base || !key || !session || update.event !== 'message.any' || update.session !== session
    || update.me?.id !== `${env.CREATOR_INTAKE_WHATSAPP_PHONE}@c.us`) return update;
  const parsed = IntakeWahaMessage.safeParse(update.payload);
  if (!parsed.success) return update;
  const message = parsed.data;
  const peer = message.fromMe ? message.to ?? message.from : message.from;
  if (!peer || !/^\d+@lid$/.test(peer)) return update;
    const response = await fetch(`${base}/api/${encodeURIComponent(session)}/lids/${encodeURIComponent(peer)}`, {
      headers: { 'X-Api-Key': key }, signal: AbortSignal.timeout(5000), cache: 'no-store',
    });
    const raw: unknown = await response.json();
    const mapping = IntakeWahaLid.safeParse(raw);
    if (!response.ok || !mapping.success || mapping.data.lid !== peer) throw new Error('identity-unresolved');
    return { ...update, payload: { ...message,
      ...(message.fromMe ? { to: mapping.data.pn } : { from: mapping.data.pn }),
    } };
}
