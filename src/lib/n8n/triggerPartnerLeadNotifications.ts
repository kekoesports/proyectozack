import 'server-only';

import { env } from '@/lib/env';

const WEBHOOK_TIMEOUT_MS = 5_000;

export type PartnerLeadTriggerResult = 'triggered' | 'skipped' | 'failed';

/** Despierta n8n; su sondeo periódico actúa como recuperación si falla. */
export async function triggerPartnerLeadNotifications(): Promise<PartnerLeadTriggerResult> {
  const url = env.N8N_PARTNER_LEADS_WEBHOOK_URL;
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
