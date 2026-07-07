import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { requireRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { invoices } from '@/db/schema/invoices';
import { crmBrands } from '@/db/schema/crmBrands';
import { files } from '@/db/schema/files';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

/**
 * Proxy portal marca para PDFs de facturas.
 *
 * Auth boundary DIFERENTE del admin: usa `requireRole('brand')` (Better Auth,
 * rol específico del portal de marca), no `requirePermission`.
 *
 * Ownership:
 *   Sólo sirve una factura si `invoices.brandId → crmBrands.portalUserId`
 *   coincide con `session.user.id`. Si no coincide → 404 fail-closed
 *   (no revelar existencia de la factura).
 *
 * Visibilidad consistente con `getInvoicesForBrandUser`:
 *   - kind = 'income'
 *   - status != 'anulada'
 *
 * Resuelve el PDF en este orden (mismo patrón que /api/admin/facturacion/[id]/pdf):
 *   1. `invoices.invoiceFileId` → `files.url` (canónico)
 *   2. `invoices.fileUrl` (legacy)
 *
 * El token de Blob nunca se expone al cliente — se descarga server-side y se
 * re-streamea con `Cache-Control: private, no-store` + `X-Content-Type-Options: nosniff`.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireRole('brand', '/marcas/login');

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const rows = await db
    .select({
      invoiceFileUrl:  files.url,
      invoiceFileName: files.name,
      legacyFileUrl:   invoices.fileUrl,
      invoiceNumber:   invoices.number,
      kind:            invoices.kind,
      status:          invoices.status,
      portalUserId:    crmBrands.portalUserId,
    })
    .from(invoices)
    .innerJoin(crmBrands, eq(crmBrands.id, invoices.brandId))
    .leftJoin(files,      eq(files.id,     invoices.invoiceFileId))
    .where(eq(invoices.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Ownership fail-closed. Cualquier mismatch → 404 sin revelar detalles.
  if (row.portalUserId !== session.user.id) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Visibilidad coherente con el listado del portal.
  if (row.kind !== 'income' || row.status === 'anulada') {
    return new NextResponse('Not found', { status: 404 });
  }

  const fileUrl = row.invoiceFileUrl ?? row.legacyFileUrl;
  if (!fileUrl) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  const rawName =
    row.invoiceFileName ??
    (row.invoiceNumber ? `${row.invoiceNumber}.pdf` : 'factura.pdf');

  return streamPrivateBlob({
    fileUrl,
    filename: rawName,
    fallbackContentType: 'application/pdf',
  });
}
