import { NextResponse } from 'next/server';

import { acknowledgeDiscordDealCreatedNotification } from '@/lib/queries/automationDiscordDealNotifications';
import { AutomationDealRouteId } from '@/lib/schemas/automationDeal';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const { id: rawId } = await params;
  const id = AutomationDealRouteId.safeParse(rawId);
  if (!id.success) {
    return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });
  }

  const result = await acknowledgeDiscordDealCreatedNotification(id.data);
  if (result === 'not_found') {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, acknowledged: result === 'acknowledged' }, { status: 200 });
}
