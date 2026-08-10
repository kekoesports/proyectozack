import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { invoices } from '@/db/schema/invoices';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

/**
 * Proxy admin for internal invoice receipt files (private Vercel Blob).
 * Never exposes BLOB_READ_WRITE_TOKEN to the client.
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
      receiptFileUrl: invoices.receiptFileUrl,
      number: invoices.number,
    })
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!row?.receiptFileUrl) {
    return new NextResponse('Comprobante no disponible', { status: 404 });
  }

  return streamPrivateBlob({
    fileUrl: row.receiptFileUrl,
    filename: row.number ? `comprobante-${row.number}.pdf` : 'comprobante.pdf',
  });
}
