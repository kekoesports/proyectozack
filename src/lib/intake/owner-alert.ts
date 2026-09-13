import 'server-only';
import { env } from '@/lib/env';
import { IntakeTelegramConnection, IntakeTelegramReceipt } from '@/lib/schemas/intakeTelegram';

/** Dedicated private owner destination; never a creator chat or group. */
export async function verifyIntakeOwnerAlert(): Promise<boolean> {
  const token = env.CREATOR_INTAKE_TELEGRAM_TOKEN;
  const connection = env.CREATOR_INTAKE_TELEGRAM_CONNECTION;
  const owner = env.CREATOR_INTAKE_TELEGRAM_OWNER;
  if (!token || !connection || !owner || env.CREATOR_INTAKE_TELEGRAM_ALERT_CHAT !== owner) return false;
  const response = await fetch(`https://api.telegram.org/bot${token}/getBusinessConnection`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_connection_id: connection }),
    signal: AbortSignal.timeout(5000), cache: 'no-store',
  });
  const raw: unknown = await response.json();
  const parsed = IntakeTelegramConnection.safeParse(raw);
  return response.ok && parsed.success && parsed.data.result.is_enabled
    && parsed.data.result.id === connection && String(parsed.data.result.user.id) === owner;
}

export async function sendIntakeOwnerAlert(text: string, conversationId: string): Promise<string | null> {
  if (!env.CREATOR_INTAKE_ENABLED || !env.CREATOR_INTAKE_SEND_ENABLED || !await verifyIntakeOwnerAlert()) return null;
  const response = await fetch(`https://api.telegram.org/bot${env.CREATOR_INTAKE_TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.CREATOR_INTAKE_TELEGRAM_ALERT_CHAT,
      text: `${text}\n${env.NEXT_PUBLIC_SITE_URL}/admin/captacion?id=${encodeURIComponent(conversationId)}`,
      protect_content: true, link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(5000), cache: 'no-store',
  });
  const raw: unknown = await response.json();
  const parsed = IntakeTelegramReceipt.safeParse(raw);
  return response.ok && parsed.success ? String(parsed.data.result.message_id) : null;
}
