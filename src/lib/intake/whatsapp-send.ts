import 'server-only';
import { env } from '@/lib/env';
import { IntakeWhatsAppPhone, IntakeWhatsAppReceipt } from '@/lib/schemas/intakeWhatsApp';
import type { IntakeSender } from './delivery';
import { sendIntakeOwnerAlert, verifyIntakeOwnerAlert } from './owner-alert';

export const sendIntakeWhatsApp: IntakeSender = async (input) => {
  const token = env.CREATOR_INTAKE_WHATSAPP_TOKEN;
  const phoneId = env.CREATOR_INTAKE_WHATSAPP_PHONE_ID;
  const phone = env.CREATOR_INTAKE_WHATSAPP_PHONE;
  const age = Date.now() - input.lastInboundAt.getTime();
  if (input.channel !== 'whatsapp' || !env.CREATOR_INTAKE_ENABLED || !env.CREATOR_INTAKE_SEND_ENABLED
    || !env.CREATOR_INTAKE_WHATSAPP_ENABLED || !token || !phoneId || !phone
    || input.accountId !== phoneId || !env.CREATOR_INTAKE_WHATSAPP_CHATS?.split(',').includes(input.chatId)
    || !Number.isFinite(age) || age < 0 || age >= 24 * 60 * 60_000) return null;
  if (input.kind === 'alert') return sendIntakeOwnerAlert(input.text, input.conversationId);
  if (input.kind !== 'reply'
    || (env.CREATOR_INTAKE_TELEGRAM_ENABLED !== false && !await verifyIntakeOwnerAlert())) return null;
  // The app-only asset is insufficient: verify the actual API phone and coexistence.
  const base = `https://graph.facebook.com/v26.0/${phoneId}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const check = await fetch(`${base}?fields=id,display_phone_number,is_on_biz_app,platform_type`, {
    headers, signal: AbortSignal.timeout(5000), cache: 'no-store',
  });
  const rawPhone: unknown = await check.json();
  const parsedPhone = IntakeWhatsAppPhone.safeParse(rawPhone);
  if (!check.ok || !parsedPhone.success || parsedPhone.data.id !== phoneId
    || parsedPhone.data.display_phone_number.replace(/\D/g, '') !== phone) return null;
  const response = await fetch(`${base}/messages`, {
    method: 'POST', headers, body: JSON.stringify({ messaging_product: 'whatsapp',
      recipient_type: 'individual', to: input.chatId, type: 'text', text: { preview_url: false, body: input.text } }),
    signal: AbortSignal.timeout(5000), cache: 'no-store',
  });
  const raw: unknown = await response.json();
  const parsed = IntakeWhatsAppReceipt.safeParse(raw);
  return response.ok && parsed.success ? parsed.data.messages[0]?.id ?? null : null;
};
