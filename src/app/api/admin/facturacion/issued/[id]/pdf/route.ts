import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { issuedInvoices } from '@/db/schema';
import { env } from '@/lib/env';

/**
 * Proxy admin for issued invoice PDFs stored in private Vercel Blob.
 * Never expose `issued_invoices.pdf_url` to the browser — stream via this route.
 *
 * Requires `facturacion:read`.
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

  const [row] = await db
    .select({
      pdfUrl: issuedInvoices.pdfUrl,
      invoiceNumber: issuedInvoices.invoiceNumber,
    })
    .from(issuedInvoices)
    .where(eq(issuedInvoices.id, id))
    .limit(1);

  if (!row?.pdfUrl) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return new NextResponse('Servicio no disponible', { status: 503 });
  }

  const blobRes = await fetch(row.pdfUrl, {
    headers: { Authorization: `Bearer ${blobToken}` },
  });

  if (!blobRes.ok) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  const contentType = blobRes.headers.get('content-type') ?? 'application/pdf';
  const buffer = await blobRes.arrayBuffer();
  const rawName = row.invoiceNumber ? `${row.invoiceNumber}.pdf` : 'factura-emitida.pdf';
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
