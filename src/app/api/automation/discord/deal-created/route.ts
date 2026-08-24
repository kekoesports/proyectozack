import { NextResponse } from 'next/server';

import { listPendingDiscordDealCreatedNotifications } from '@/lib/queries/automationDiscordDealNotifications';
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

  const notifications = await listPendingDiscordDealCreatedNotifications();
  return NextResponse.json({ ok: true, notifications }, { status: 200 });
}
