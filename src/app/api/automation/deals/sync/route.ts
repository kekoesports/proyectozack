import { NextResponse } from 'next/server';

import { syncAllAutomatedDeals } from '@/lib/queries/automationDeals';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

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
