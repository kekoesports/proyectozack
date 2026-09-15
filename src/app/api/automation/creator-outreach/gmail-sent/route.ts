import { NextResponse } from 'next/server';

import { persistGmailSentCreatorEmail } from '@/lib/queries/gmailSentSync';
import { gmailSentMessageSchema } from '@/lib/schemas/creator-outreach';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = gmailSentMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }
  try {
    const result = await persistGmailSentCreatorEmail(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    console.error('[gmail-sent-sync] processing failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
