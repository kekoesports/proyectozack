import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { streamEntityAsset } from '@/lib/files/streamEntityAsset';

/**
 * Proxy público para el logo de marca apuntado por el índice portable.
 *
 * Sin auth: los logos de marca son contenido público (carrusel home, /marcas/[slug]).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: rawId } = await params;
  const brandId = parseInt(rawId, 10);
  if (!brandId || isNaN(brandId)) {
    return new NextResponse('Not found', { status: 404 });
  }

  return streamEntityAsset({
    kind: 'brand_logo',
    entityId: brandId,
    legacyPrefix: `brands/${brandId}-`,
    emptyMessage: 'No logo',
    defaultContentType: 'image/png',
  });
}
