import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSignerByToken } from '@/lib/queries/contracts';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

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

  if (!signerData.contract.fileUrl && !signerData.contract.filePath) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }
  return streamPrivateBlob({
    fileUrl: signerData.contract.fileUrl,
    storageKey: signerData.contract.filePath,
    filename: signerData.contract.fileName ?? 'contrato.pdf',
    fallbackContentType: 'application/pdf',
  });
}
