import { NextResponse } from 'next/server';

import {
  AutomationDealDraftError,
  getAutomationDealDraft,
  getAutomationDealMissingFields,
  reviewAutomationDealDraft,
} from '@/lib/queries/automationDealDrafts';
import { AutomationDealDraftReview, AutomationDealRouteId } from '@/lib/schemas/automationDeal';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: RouteContext): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }
  const id = AutomationDealRouteId.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });
  const draft = await getAutomationDealDraft(id.data);
  return draft
    ? NextResponse.json({
        ok: true,
        draft: {
          ...draft,
          missingFields: getAutomationDealMissingFields(draft.proposedDeal),
        },
      })
    : NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
}

export async function PATCH(req: Request, context: RouteContext): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }
  const id = AutomationDealRouteId.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });
  const body: unknown = await req.json().catch(() => null);
  const review = AutomationDealDraftReview.safeParse(body);
  if (!review.success) {
    return NextResponse.json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }
  try {
    const result = await reviewAutomationDealDraft({ id: id.data, ...review.data });
    return result
      ? NextResponse.json({ ok: true, ...result })
      : NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  } catch (error) {
    if (error instanceof AutomationDealDraftError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    console.error('[automation-deal-drafts] review failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
