import { NextResponse } from 'next/server';

import {
  formatAutomationDealDetailForDiscord,
  formatAutomationDealDigestForDiscord,
  getAutomationDealDigest,
} from '@/lib/queries/automationDealDigest';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  try {
    const query = new URL(req.url).searchParams.get('q')?.trim() ?? '';
    if (query.length > 80) {
      return NextResponse.json({ ok: false, error: 'query-too-long' }, { status: 400 });
    }
    const digest = await getAutomationDealDigest();
    const discordMessages = query
      ? formatAutomationDealDetailForDiscord(digest, query)
      : formatAutomationDealDigestForDiscord(digest);
    return NextResponse.json({ ok: true, ...digest, discordMessages });
  } catch {
    console.error('[automation-deals] digest failed');
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
