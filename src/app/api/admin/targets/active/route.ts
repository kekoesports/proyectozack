import { NextResponse } from 'next/server';

import { verifyTargetsImportToken } from '@/lib/auth-targets-import';
import { getActiveTargetsPage } from '@/lib/queries/creatorTargetsApi';
import { creatorTargetsActiveQuery } from '@/lib/schemas/creatorTargetsApi';

export async function GET(req: Request): Promise<NextResponse> {
  const auth = verifyTargetsImportToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const url = new URL(req.url);
  const parsed = creatorTargetsActiveQuery.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-query', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { limit, platform, cursor } = parsed.data;
  const page = await getActiveTargetsPage({
    limit,
    ...(platform !== undefined && { platform }),
    ...(cursor !== undefined && { cursor }),
  });
  return NextResponse.json({ ok: true, ...page });
}
