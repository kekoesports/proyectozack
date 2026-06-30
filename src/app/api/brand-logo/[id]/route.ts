import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { env } from '@/lib/env';

/**
 * Proxy público para logos de marca almacenados en Vercel Blob privado.
 *
 * - El Blob store está configurado como private-only (access: 'private').
 * - Este endpoint usa el BLOB_READ_WRITE_TOKEN server-side para autenticar
 *   la descarga y re-servir la imagen públicamente con cache.
 * - logoUrl en DB = '/api/brand-logo/{id}' (esta ruta).
 *   Lista los blobs del brand por prefijo brands/{id}- y sirve el más reciente.
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

  const { blobs } = await list({ prefix: `brands/${brandId}-` });

  if (blobs.length === 0) {
    return new NextResponse('No logo', { status: 404 });
  }

  const sorted = [...blobs].sort((a, b) =>
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  const blob = sorted[0];
  if (!blob) return new NextResponse('No logo', { status: 404 });

  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.redirect(blob.url, 302);
  }

  const blobRes = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!blobRes.ok) {
    return new NextResponse(`Blob fetch error: ${blobRes.status}`, { status: blobRes.status });
  }

  const contentType = blobRes.headers.get('content-type') ?? 'image/png';
  const buffer = await blobRes.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
