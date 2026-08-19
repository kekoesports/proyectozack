import { NextResponse } from 'next/server';

import { createAutomationDealDraft } from '@/lib/queries/automationDealDrafts';
import { AutomationDealDraftCreate } from '@/lib/schemas/automationDeal';
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
  const body: unknown = await req.json().catch(() => null);
  const parsed = AutomationDealDraftCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const draft = await createAutomationDealDraft(parsed.data);
    return NextResponse.json({ ok: true, draft }, { status: draft.created ? 201 : 200 });
  } catch {
    console.error('[automation-deal-drafts] create failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
