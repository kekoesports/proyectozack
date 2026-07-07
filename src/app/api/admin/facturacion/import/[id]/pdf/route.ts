import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/permissions';
import { getImport } from '@/lib/queries/invoiceImports';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

/**
 * Proxy admin para PDFs del staging `invoice_imports`.
 *
 * Requiere `facturacion:read`. El token de Blob jamás se expone al cliente.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await requirePermission('facturacion', 'read');

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const imp = await getImport(id);
  if (!imp || !imp.fileUrl) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  return streamPrivateBlob({
    fileUrl: imp.fileUrl,
    filename: imp.sourceFilename,
    fallbackContentType: 'application/pdf',
  });
}
