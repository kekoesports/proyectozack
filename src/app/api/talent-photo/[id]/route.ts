import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { streamEntityAsset } from '@/lib/files/streamEntityAsset';

/**
 * Proxy público para la foto de talento apuntada por el índice portable.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: rawId } = await params;
  const talentId = parseInt(rawId, 10);
  if (!talentId || isNaN(talentId)) {
    return new NextResponse('Not found', { status: 404 });
  }

  return streamEntityAsset({
    kind: 'talent_photo',
    entityId: talentId,
    legacyPrefix: `talents/${talentId}-`,
    emptyMessage: 'No photo',
    defaultContentType: 'image/jpeg',
  });
}
