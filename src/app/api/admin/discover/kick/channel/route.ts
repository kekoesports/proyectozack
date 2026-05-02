import { NextResponse } from 'next/server';

import { verifyTargetsImportToken } from '@/lib/auth-targets-import';
import { discoverKickChannelBody } from '@/lib/schemas/creatorTargetsApi';
import { getKickChannel } from '@/lib/services/kick';

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyTargetsImportToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = discoverKickChannelBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const channel = await getKickChannel(parsed.data.slug);
  if (!channel) {
    return NextResponse.json(
      { ok: false, error: 'channel-not-found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, channel });
}
