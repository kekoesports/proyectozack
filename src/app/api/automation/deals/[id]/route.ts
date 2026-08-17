import { NextResponse } from 'next/server';

import {
  attachAutomatedDealSheet,
  getAutomatedDealProgress,
  syncAutomatedDeal,
} from '@/lib/queries/automationDeals';
import {
  AutomationDealRouteId,
  AutomationTrackingSheetUpdate,
} from '@/lib/schemas/automationDeal';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

function authFailure(req: Request): NextResponse | null {
  const auth = verifyAutomationToken(req);
  if (auth.ok) return null;
  return NextResponse.json(
    { ok: false, error: auth.reason },
    { status: auth.reason === 'missing-config' ? 503 : 401 },
  );
}

async function parseRouteId(context: RouteContext): Promise<number | null> {
  const params = await context.params;
  const parsed = AutomationDealRouteId.safeParse(params.id);
  return parsed.success ? parsed.data : null;
}

export async function GET(req: Request, context: RouteContext): Promise<NextResponse> {
  const authError = authFailure(req);
  if (authError) return authError;
  const id = await parseRouteId(context);
  if (!id) return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });

  const progress = await getAutomatedDealProgress(id);
  if (!progress) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, progress });
}

export async function PATCH(req: Request, context: RouteContext): Promise<NextResponse> {
  const authError = authFailure(req);
  if (authError) return authError;
  const id = await parseRouteId(context);
  if (!id) return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = AutomationTrackingSheetUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const progress = await attachAutomatedDealSheet(id, parsed.data.trackingSheetUrl);
  if (!progress) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, progress });
}

export async function POST(req: Request, context: RouteContext): Promise<NextResponse> {
  const authError = authFailure(req);
  if (authError) return authError;
  const id = await parseRouteId(context);
  if (!id) return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });

  const result = await syncAutomatedDeal(id);
  if (!result) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
