import { NextResponse } from 'next/server';
import { listPendingCreatorDigests } from '@/lib/queries/creatorDigest';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';
import { creatorDigestSinceSchema } from '@/lib/schemas/creator-digest';

export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.reason === 'missing-config' ? 503 : 401 });
  const since = creatorDigestSinceSchema.safeParse(new URL(request.url).searchParams.get('since') ?? undefined);
  if (!since.success) return NextResponse.json({ ok: false, error: 'invalid_since' }, { status: 400 });
  return NextResponse.json({ ok: true, notifications: await listPendingCreatorDigests(since.data ? new Date(since.data) : undefined) });
}
