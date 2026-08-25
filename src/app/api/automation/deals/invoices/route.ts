import { NextResponse } from 'next/server';

import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';
import {
  createEligibleDealInvoiceDrafts,
  formatInvoiceDraftBatchForDiscord,
} from '@/lib/services/dealInvoiceDrafts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  let announceExisting = false;
  try {
    const body = await req.json() as { announceExisting?: unknown };
    announceExisting = body.announceExisting === true;
  } catch {
    // n8n puede llamar sin body en la ejecución automática.
  }

  try {
    const result = await createEligibleDealInvoiceDrafts();
    return NextResponse.json({
      ok: true,
      ...result,
      discordMessages: formatInvoiceDraftBatchForDiscord(result, announceExisting),
    });
  } catch {
    console.error('[automation-deal-invoices] batch failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
