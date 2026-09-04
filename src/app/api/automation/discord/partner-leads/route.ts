import { NextResponse } from 'next/server';

import { listPartnerLeadDiscordNotifications } from '@/lib/queries/partnerLeadDiscordNotifications';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const result = await listPartnerLeadDiscordNotifications();
  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}
