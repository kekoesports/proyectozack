import { NextResponse } from 'next/server';

import { verifyTargetsImportToken } from '@/lib/auth-targets-import';
import { env } from '@/lib/env';
import { discoverTwitchSearchBody } from '@/lib/schemas/creatorTargetsApi';
import {
  searchTwitchChannels,
  fetchTwitchFollowerCounts,
} from '@/lib/services/twitch';

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyTargetsImportToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'missing-twitch-credentials' },
      { status: 503 },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = discoverTwitchSearchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const channels = await searchTwitchChannels(parsed.data.query, parsed.data.liveOnly);
  const truncated = channels.slice(0, parsed.data.limit);

  if (truncated.length === 0) {
    return NextResponse.json({ ok: true, channels: [] });
  }

  const followers = await fetchTwitchFollowerCounts(truncated.map((c) => c.broadcasterId));
  const followerMap = new Map(followers.map((f) => [f.broadcasterId, f.followerCount]));

  const enriched = truncated.map((c) => ({
    ...c,
    followerCount: followerMap.get(c.broadcasterId) ?? 0,
  }));

  return NextResponse.json({ ok: true, channels: enriched });
}
