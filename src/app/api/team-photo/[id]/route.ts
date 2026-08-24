import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { streamEntityAsset } from '@/lib/files/streamEntityAsset';

/**
 * Proxy público para la foto de equipo apuntada por el índice portable.
 *
 * Sin auth: las fotos del equipo son contenido público (/nosotros, home).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: rawId } = await params;
  const memberId = parseInt(rawId, 10);
  if (!memberId || isNaN(memberId)) {
    return new NextResponse('Not found', { status: 404 });
  }

  return streamEntityAsset({
    kind: 'team_photo',
    entityId: memberId,
    legacyPrefix: `team/${memberId}-`,
    emptyMessage: 'No photo',
    defaultContentType: 'image/jpeg',
  });
}
