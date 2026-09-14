import 'server-only';
import { env } from '@/lib/env';
import { IntakeTelegramConnection, IntakeTelegramReceipt } from '@/lib/schemas/intakeTelegram';
import type { IntakeSender } from './delivery';

export const sendIntakeTelegram: IntakeSender = async (input) => {
  if (env.CREATOR_INTAKE_TELEGRAM_ENABLED === false) return null;
  const token = env.CREATOR_INTAKE_TELEGRAM_TOKEN;
  const connection = env.CREATOR_INTAKE_TELEGRAM_CONNECTION;
  if (input.channel !== 'telegram' || !env.CREATOR_INTAKE_ENABLED || !env.CREATOR_INTAKE_SEND_ENABLED || !token || !connection
    || input.accountId !== connection || !env.CREATOR_INTAKE_TELEGRAM_CHATS?.split(',').includes(input.chatId)) return null;
  // Revalidate connection rights and owner before every effect, including alerts.
  const connectionResponse = await fetch(`https://api.telegram.org/bot${token}/getBusinessConnection`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_connection_id: connection }), signal: AbortSignal.timeout(5000), cache: 'no-store',
  });
  const rawConnection: unknown = await connectionResponse.json();
  const check = IntakeTelegramConnection.safeParse(rawConnection);
  if (!check.success || !check.data.result.is_enabled || !check.data.result.rights?.can_reply
    || check.data.result.id !== connection || String(check.data.result.user.id) !== env.CREATOR_INTAKE_TELEGRAM_OWNER) return null;
  const alertChat = env.CREATOR_INTAKE_TELEGRAM_ALERT_CHAT;
  if (input.kind === 'alert' && (!alertChat || alertChat !== env.CREATOR_INTAKE_TELEGRAM_OWNER)) return null;
  const text = input.kind === 'alert'
    ? `${input.text}\n${env.NEXT_PUBLIC_SITE_URL}/admin/captacion?id=${input.conversationId}` : input.text;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: input.kind === 'alert' ? alertChat : input.chatId,
      ...(input.kind === 'reply' ? { business_connection_id: connection } : {}),
      text, protect_content: true, link_preview_options: { is_disabled: true },
    }), signal: AbortSignal.timeout(5000), cache: 'no-store',
  });
  const raw: unknown = await response.json();
  const parsed = IntakeTelegramReceipt.safeParse(raw);
  return response.ok && parsed.success ? String(parsed.data.result.message_id) : null;
};
