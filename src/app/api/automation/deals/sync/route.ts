import { NextResponse } from 'next/server';

import { syncAllAutomatedDeals } from '@/lib/queries/automationDeals';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

/**
 * Sincroniza N campañas contra Google Sheets, con 2 llamadas HTTP por campaña.
 * El default de 15s de Vercel no da: se corta a mitad, deja campañas sin
 * `tracking_sync_error` y n8n reintenta sobre un estado a medias.
 * Mismo valor que `/api/cron/sync-metrics`.
 */
export const maxDuration = 120;

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  try {
    const result = await syncAllAutomatedDeals();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    console.error('[automation-deals] sync-all failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
