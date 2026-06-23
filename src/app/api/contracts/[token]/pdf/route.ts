import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSignerByToken } from '@/lib/queries/contracts';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Proxy para descargar el PDF de un contrato desde Vercel Blob privado.
 *
 * El firmante recibe el link /api/contracts/{token}/pdf en su email.
 * El token valida que el firmante existe y tiene acceso a ese contrato.
 * El PDF se descarga server-side con el BLOB_READ_WRITE_TOKEN y se
 * re-sirve al browser — el token de blob nunca se expone al cliente.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  if (!token || typeof token !== 'string') {
    return new NextResponse('Not found', { status: 404 });
  }

  const signerData = await getSignerByToken(token);
  if (!signerData) {
    return new NextResponse('Not found', { status: 404 });
  }

  const fileUrl = signerData.contract.fileUrl;
  if (!fileUrl) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return new NextResponse('Servicio no disponible', { status: 503 });
  }

  const blobRes = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${blobToken}` },
  });

  if (!blobRes.ok) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  const contentType = blobRes.headers.get('content-type') ?? 'application/pdf';
  const buffer = await blobRes.arrayBuffer();

  const safeName = (signerData.contract.fileName ?? 'contrato.pdf')
    .replace(/[^\w.\-]/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 200);

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
