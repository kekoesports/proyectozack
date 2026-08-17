import { NextResponse } from 'next/server';

import { AutomationDealInputError, createAutomatedDeal } from '@/lib/queries/automationDeals';
import { AutomationDealCreate, AutomationIdempotencyKey } from '@/lib/schemas/automationDeal';
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

  const key = AutomationIdempotencyKey.safeParse(req.headers.get('idempotency-key'));
  if (!key.success) {
    return NextResponse.json({ ok: false, error: 'invalid-idempotency-key' }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = AutomationDealCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await createAutomatedDeal(parsed.data, key.data);
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof AutomationDealInputError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 422 });
    }
    console.error('[automation-deals] create failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
