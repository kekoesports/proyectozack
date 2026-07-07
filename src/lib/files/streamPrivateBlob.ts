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
  readonly fileUrl: string;
  readonly filename: string;
  readonly fallbackContentType?: string;
}): Promise<NextResponse> {
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
  const safeName = sanitizeFilename(input.filename);

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
