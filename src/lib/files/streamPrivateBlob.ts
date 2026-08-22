import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Sanea un nombre de fichero para `Content-Disposition`:
 * - Sustituye cualquier carácter que no sea `\w`, `.` o `-` por `_`.
 * - Colapsa cualquier corrida de puntos a uno solo.
 * - Trunca a 200 caracteres.
 * Patrón alineado con los proxies existentes de contratos y facturación.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w.\-]/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 200);
}

/**
 * Descarga un blob privado con Bearer server-side y lo re-streamea al cliente
 * con cabeceras de seguridad (no cache, no sniff, inline).
 *
 * El token de Blob NUNCA se envía al cliente.
 */
export async function streamPrivateBlob(input: {
  /** URL histórica de Vercel Blob. */
  readonly fileUrl?: string | null;
  /** Clave portable del proveedor actual. Tiene prioridad sobre fileUrl. */
  readonly storageKey?: string | null;
  readonly filename: string;
  readonly fallbackContentType?: string;
}): Promise<NextResponse> {
  const safeName = sanitizeFilename(input.filename);
  const responseHeaders = {
    'Content-Type': input.fallbackContentType ?? 'application/octet-stream',
    'Content-Disposition': `inline; filename="${safeName}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };

  if (input.storageKey) {
    try {
      const { openFile } = await import('@/lib/storage');
      const stored = await openFile(input.storageKey);
      return new NextResponse(stored.stream, { status: 200, headers: responseHeaders });
    } catch {
      // Durante la convivencia algunas filas antiguas pueden tener un
      // filePath incorrecto pero conservar la URL válida. Se intenta la ruta
      // heredada antes de responder 404.
      if (!input.fileUrl) return new NextResponse('Archivo no disponible', { status: 404 });
    }
  }

  if (!input.fileUrl) {
    return new NextResponse('Archivo no disponible', { status: 404 });
  }

  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new NextResponse('Servicio no disponible', { status: 503 });
  }

  const blobRes = await fetch(input.fileUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!blobRes.ok) {
    return new NextResponse('Archivo no disponible', { status: 404 });
  }

  const contentType =
    blobRes.headers.get('content-type') ??
    input.fallbackContentType ??
    'application/octet-stream';
  const buffer = await blobRes.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
