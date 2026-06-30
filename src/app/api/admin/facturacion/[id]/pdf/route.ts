import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { invoices } from '@/db/schema/invoices';
import { files } from '@/db/schema/files';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';

/**
 * Proxy admin para PDFs de facturas almacenados en Vercel Blob privado.
 *
 * Resuelve el PDF en este orden:
 *   1. `invoices.invoiceFileId` → `files.url` (canonical post-refactor)
 *   2. `invoices.fileUrl` (legacy, kept for compat)
 *
 * Si ambos están vacíos → 404 "PDF no disponible".
 *
 * Requiere permiso `facturacion:read`. El token de Blob jamás se expone
 * al cliente — se usa server-side para descargar el blob y se re-streamea
 * con `Cache-Control: private, no-store`.
 *
 * Patrón copiado de `/api/admin/contratos/[id]/pdf/route.ts` (PR #115).
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

  // Resolver PDF: prefer files.url via invoiceFileId; fallback a invoices.fileUrl legacy.
  const rows = await db
    .select({
      invoiceFileUrl:  files.url,
      invoiceFileName: files.name,
      legacyFileUrl:   invoices.fileUrl,
      invoiceNumber:   invoices.number,
    })
    .from(invoices)
    .leftJoin(files, eq(files.id, invoices.invoiceFileId))
    .where(eq(invoices.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return new NextResponse('Not found', { status: 404 });
  }

  const fileUrl = row.invoiceFileUrl ?? row.legacyFileUrl;
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

  // Nombre seguro para Content-Disposition. Si no hay name en files, usar
  // el número de factura como base; fallback a 'factura.pdf'.
  const rawName =
    row.invoiceFileName ??
    (row.invoiceNumber ? `${row.invoiceNumber}.pdf` : 'factura.pdf');
  const safeName = rawName
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
