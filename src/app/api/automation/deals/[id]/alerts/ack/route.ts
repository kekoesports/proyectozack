import { NextResponse } from 'next/server';

import { acknowledgeAutomatedDealAlert } from '@/lib/queries/automationDeals';
import {
  AutomationDealAlertAcknowledgement,
  AutomationDealRouteId,
} from '@/lib/schemas/automationDeal';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

export async function POST(req: Request, context: RouteContext): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const params = await context.params;
  const id = AutomationDealRouteId.safeParse(params.id);
  if (!id.success) {
    return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => null);
  const acknowledgement = AutomationDealAlertAcknowledgement.safeParse(body);
  if (!acknowledgement.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: acknowledgement.error.flatten() },
      { status: 400 },
    );
  }

  const progress = await acknowledgeAutomatedDealAlert(id.data, acknowledgement.data.level);
  if (!progress) {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, progress });
}
