import 'server-only';
import { env } from '@/lib/env';
import { IntakeWahaReceipt, IntakeWahaSession } from '@/lib/schemas/intakeWaha';
import type { IntakeSender } from './delivery';
import { sendIntakeOwnerAlert, verifyIntakeOwnerAlert } from './owner-alert';
import { wahaIntakeAccount } from './waha-account';
import { IntakeSendNotAttempted } from './send-errors';

export const sendIntakeWaha: IntakeSender = async (input) => {
  const base = env.CREATOR_INTAKE_WAHA_URL;
  const key = env.CREATOR_INTAKE_WAHA_KEY;
  const session = env.CREATOR_INTAKE_WAHA_SESSION;
  const phone = env.CREATOR_INTAKE_WHATSAPP_PHONE;
  if (!env.CREATOR_INTAKE_ENABLED || !env.CREATOR_INTAKE_SEND_ENABLED
    || !env.CREATOR_INTAKE_WAHA_ENABLED || !base || !key || !session || !phone
    || input.channel !== 'whatsapp' || input.accountId !== wahaIntakeAccount(phone, env.CREATOR_INTAKE_WAHA_RUN)
    || !env.CREATOR_INTAKE_WHATSAPP_CHATS?.split(',').includes(input.chatId)) return null;
  if (input.kind === 'alert') return sendIntakeOwnerAlert(input.text, input.conversationId);
  if (input.kind !== 'reply') return null;
  const headers = { 'X-Api-Key': key, 'Content-Type': 'application/json' };
  try {
    if (!await verifyIntakeOwnerAlert()) throw new IntakeSendNotAttempted();
    const check = await fetch(`${base}/api/sessions/${encodeURIComponent(session)}`, {
      headers, signal: AbortSignal.timeout(5000), cache: 'no-store',
    });
    const rawSession: unknown = await check.json();
    const identity = IntakeWahaSession.safeParse(rawSession);
    if (!check.ok || !identity.success || identity.data.name !== session
      || identity.data.me.id !== `${phone}@c.us`) throw new IntakeSendNotAttempted();
  } catch { throw new IntakeSendNotAttempted(); }
  // Deliberately no retries: an unknown receipt must pause the conversation.
  const response = await fetch(`${base}/api/sendText`, { method: 'POST', headers,
    body: JSON.stringify({ session, chatId: `${input.chatId}@c.us`, text: input.text, linkPreview: false }),
    signal: AbortSignal.timeout(10_000), cache: 'no-store',
  });
  const raw: unknown = await response.json();
  const receipt = IntakeWahaReceipt.safeParse(raw);
  return response.ok && receipt.success ? receipt.data.id : null;
};
