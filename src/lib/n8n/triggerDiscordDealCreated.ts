import 'server-only';

import { env } from '@/lib/env';

const WEBHOOK_TIMEOUT_MS = 5_000;

export type DiscordDealCreatedTriggerResult = 'triggered' | 'skipped' | 'failed';

/**
 * Despierta el workflow de confirmación en cuanto el CRM aprueba el trato.
 *
 * Es best-effort: el Schedule Trigger de n8n vuelve a consultar la misma cola
 * cada dos minutos, así que un fallo de red no pierde el aviso ni bloquea la
 * aprobación humana.
 */
export async function triggerDiscordDealCreatedWorkflow(): Promise<DiscordDealCreatedTriggerResult> {
  const url = env.N8N_DEAL_CREATED_WEBHOOK_URL;
  const token = env.AUTOMATION_API_TOKEN;
  if (!url || !token) return 'skipped';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    return response.ok ? 'triggered' : 'failed';
  } catch {
    return 'failed';
  }
}
