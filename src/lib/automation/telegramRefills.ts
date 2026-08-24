import type { AutomationTelegramRefillCreateInput } from '@/lib/schemas/automationTelegramRefill';

export function telegramRefillExternalId(updateId: number): string {
  return `telegram:${updateId}`;
}

export function buildTelegramRefillTitle(
  input: AutomationTelegramRefillCreateInput,
): string {
  const amount = input.amount ? ` — ${input.amount}` : '';
  return `[REFILL] ${input.brand} × ${input.creator}${amount}`.slice(0, 200);
}

export function buildTelegramRefillDescription(
  input: AutomationTelegramRefillCreateInput,
): string {
  const requester = input.requesterUsername
    ? `@${input.requesterUsername}`
    : (input.requesterName ?? 'No indicado');

  return [
    'Solicitud de refill recibida desde Telegram.',
    '',
    `Marca: ${input.brand}`,
    `Creador: ${input.creator}`,
    `Importe/unidades: ${input.amount ?? 'No indicado'}`,
    `Nota: ${input.note ?? 'Sin nota'}`,
    `Grupo/chat: ${input.chatTitle ?? input.chatId}`,
    `Solicitante: ${requester}`,
    '',
    `[telegram-update:${telegramRefillExternalId(input.updateId)}]`,
  ].join('\n');
}

export function todayMadridIso(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
