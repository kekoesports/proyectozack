import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

/**
 * Proxy público para fotos de talento almacenadas en Vercel Blob privado.
 *
 * - El Blob store está configurado como private-only (access: 'private').
 * - Este endpoint usa el BLOB_READ_WRITE_TOKEN server-side para autenticar
 *   la descarga y re-servir la imagen públicamente con cache.
 * - photoUrl en DB = '/api/talent-photo/{id}' (esta ruta).
 *   El proxy lista los blobs del talent y sirve el más reciente.
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

  // List blobs for this talent (stored as talents/{id}-*.ext)
  const { blobs } = await list({ prefix: `talents/${talentId}-` });

  if (blobs.length === 0) {
    return new NextResponse('No photo', { status: 404 });
  }

  // Most recent blob (sorted descending by uploadedAt)
  const sorted = [...blobs].sort((a, b) =>
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  const blob = sorted[0];
  if (!blob) return new NextResponse('No photo', { status: 404 });

  // Fetch the private blob with Bearer token
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    // No token — fall back to redirect (will fail for private blobs but graceful)
    return NextResponse.redirect(blob.url, 302);
  }

  const blobRes = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!blobRes.ok) {
    return new NextResponse(`Blob fetch error: ${blobRes.status}`, { status: blobRes.status });
  }

  const contentType = blobRes.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await blobRes.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Cache 1 day at CDN, serve stale for up to 7 days while revalidating
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
