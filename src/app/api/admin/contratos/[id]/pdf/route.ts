import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { getGeneratedContract } from '@/lib/queries/generatedContracts';
import { env } from '@/lib/env';

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

  const fileUrl = contract.fileUrl;
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

  const safeName = (contract.fileName ?? 'contrato.pdf')
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
