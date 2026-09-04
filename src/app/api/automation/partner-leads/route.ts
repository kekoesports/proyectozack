import { NextResponse } from 'next/server';

import { triggerPartnerLeadNotifications } from '@/lib/n8n/triggerPartnerLeadNotifications';
import { upsertPartnerLeadBatch } from '@/lib/queries/partnerLeads';
import { PartnerLeadBatchIntake } from '@/lib/schemas/partnerLead';
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
  const parsed = PartnerLeadBatchIntake.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await upsertPartnerLeadBatch(parsed.data);
    const discordTrigger = await triggerPartnerLeadNotifications();
    return NextResponse.json(
      { ok: true, ...result, discordTrigger },
      { status: result.created ? 201 : 200 },
    );
  } catch {
    console.error('[partner-leads] import failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
