import { NextResponse } from 'next/server';

import {
  createAutomationTelegramRefill,
  getAutomationTelegramRefill,
} from '@/lib/queries/automationTelegramRefills';
import {
  AutomationTelegramRefillCreate,
  AutomationTelegramRefillTaskId,
} from '@/lib/schemas/automationTelegramRefill';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

function unauthorizedResponse(req: Request): NextResponse | null {
  const auth = verifyAutomationToken(req);
  if (auth.ok) return null;
  return NextResponse.json(
    { ok: false, error: auth.reason },
    { status: auth.reason === 'missing-config' ? 503 : 401 },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const unauthorized = unauthorizedResponse(req);
  if (unauthorized) return unauthorized;

  const body: unknown = await req.json().catch(() => null);
  const parsed = AutomationTelegramRefillCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await createAutomationTelegramRefill(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: result.created ? 201 : 200 });
  } catch {
    console.error('[automation-telegram-refills] create failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  const unauthorized = unauthorizedResponse(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const parsedTaskId = AutomationTelegramRefillTaskId.safeParse(url.searchParams.get('taskId'));
  if (!parsedTaskId.success) {
    return NextResponse.json({ ok: false, error: 'invalid-task-id' }, { status: 400 });
  }

  try {
    const task = await getAutomationTelegramRefill(parsedTaskId.data);
    if (!task) {
      return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, task });
  } catch {
    console.error('[automation-telegram-refills] status lookup failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
