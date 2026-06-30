import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { env } from '@/lib/env';

/**
 * Proxy público para fotos del equipo almacenadas en Vercel Blob privado.
 *
 * - El Blob store está configurado como private-only (access: 'private').
 * - Este endpoint usa el BLOB_READ_WRITE_TOKEN server-side para autenticar
 *   la descarga y re-servir la imagen públicamente con cache.
 * - photoUrl en DB = '/api/team-photo/{id}' (esta ruta).
 *   Lista los blobs del miembro por prefijo team/{id}- y sirve el más reciente.
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

  const { blobs } = await list({ prefix: `team/${memberId}-` });

  if (blobs.length === 0) {
    return new NextResponse('No photo', { status: 404 });
  }

  const sorted = [...blobs].sort((a, b) =>
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  const blob = sorted[0];
  if (!blob) return new NextResponse('No photo', { status: 404 });

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

  const contentType = blobRes.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await blobRes.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
