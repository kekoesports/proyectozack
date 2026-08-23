import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { getGeneratedContract } from '@/lib/queries/generatedContracts';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await requirePermission('contratos', 'read');

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const contract = await getGeneratedContract(id);
  if (!contract) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (!contract.fileUrl && !contract.filePath) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }
  return streamPrivateBlob({
    fileUrl: contract.fileUrl,
    storageKey: contract.filePath,
    filename: contract.fileName ?? 'contrato.pdf',
    fallbackContentType: 'application/pdf',
  });
}
