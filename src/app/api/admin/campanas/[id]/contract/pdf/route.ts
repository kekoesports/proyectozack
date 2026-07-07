import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/permissions';
import { getContractByCampaign } from '@/lib/queries/contracts';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

/**
 * Proxy admin para PDFs de contratos manuales subidos por campaña (tabla `contracts`).
 *
 * NO confundir con `/api/admin/contratos/[id]/pdf`, que sirve contratos generados
 * desde plantilla (tabla `generated_contracts`).
 *
 * Requiere `campanas:read`. El token de Blob jamás se expone al cliente.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await requirePermission('campanas', 'read');

  const { id: idStr } = await params;
  const campaignId = Number(idStr);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const contract = await getContractByCampaign(campaignId);
  if (!contract || !contract.fileUrl) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  return streamPrivateBlob({
    fileUrl: contract.fileUrl,
    filename: contract.fileName ?? 'contrato.pdf',
    fallbackContentType: 'application/pdf',
  });
}
