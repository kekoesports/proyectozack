import { NextResponse } from 'next/server';
import { z } from 'zod';

import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';
import { acknowledgeTrackingReminder } from '@/lib/services/dealTrackingReminders';

const bodySchema = z.object({
  baselineAt: z.iso.datetime(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const { id } = await context.params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid-id' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  const acknowledged = await acknowledgeTrackingReminder(
    campaignId,
    new Date(parsed.data.baselineAt),
  );
  return NextResponse.json({ ok: acknowledged }, { status: acknowledged ? 200 : 409 });
}
