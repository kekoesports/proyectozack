import { NextResponse } from 'next/server';

import { verifyTargetsImportToken } from '@/lib/auth-targets-import';
import { upsertCreatorTargets } from '@/lib/queries/creatorTargetsApi';
import { creatorTargetsImportBody } from '@/lib/schemas/creatorTargetsApi';

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyTargetsImportToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = creatorTargetsImportBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { batchId, items } = parsed.data;
  const result = await upsertCreatorTargets(items, batchId);

  return NextResponse.json({
    ok: true,
    batchId,
    received: items.length,
    inserted: result.inserted,
    updated: result.updated,
    ids: result.ids,
  });
}
