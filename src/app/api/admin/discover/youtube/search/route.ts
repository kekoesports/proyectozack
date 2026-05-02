import { NextResponse } from 'next/server';

import { verifyTargetsImportToken } from '@/lib/auth-targets-import';
import { env } from '@/lib/env';
import { discoverYoutubeSearchBody } from '@/lib/schemas/creatorTargetsApi';
import { searchYouTubeChannels } from '@/lib/services/youtube';

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyTargetsImportToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  if (!env.YOUTUBE_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'missing-youtube-credentials' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = discoverYoutubeSearchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const channels = await searchYouTubeChannels(
    parsed.data.query,
    parsed.data.limit,
    parsed.data.regionCode,
    'es',
  );

  return NextResponse.json({ ok: true, channels });
}
