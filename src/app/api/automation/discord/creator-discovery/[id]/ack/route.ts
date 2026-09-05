import { NextResponse } from 'next/server';
import { acknowledgeCreatorDigest } from '@/lib/queries/creatorDigest';
import { creatorDigestAckSchema, creatorDigestRouteIdSchema } from '@/lib/schemas/creator-digest';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = verifyAutomationToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.reason === 'missing-config' ? 503 : 401 });
  const id = creatorDigestRouteIdSchema.safeParse((await context.params).id);
  const body = creatorDigestAckSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ ok: false, error: 'invalid_ack' }, { status: 400 });
  const result = await acknowledgeCreatorDigest(id.data, body.data);
  const status = result === 'not_found' ? 404 : result === 'conflict' ? 409 : 200;
  return NextResponse.json({ ok: status === 200, result }, { status });
}
