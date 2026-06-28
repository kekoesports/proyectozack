'server-only';

import { like, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices, files } from '@/db/schema';
import { uploadFile } from '@/lib/storage';
import type { PayrollImportRow, PayrollApplyResult } from '@/lib/finance/payroll/types';

export async function getExistingPayrollTxIds(): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ txId: invoices.txId })
    .from(invoices)
    .where(like(invoices.txId, 'payroll:%'));

  return new Set(
    rows.map((r) => r.txId).filter((t): t is string => t !== null && t !== undefined),
  );
}

export async function applyPayrollImport(
  rows: readonly PayrollImportRow[],
  existingTxIds: ReadonlySet<string>,
  pdfFile: File,
  uploadedByUserId: string,
): Promise<PayrollApplyResult> {
  const toInsert = rows.filter((r) => r.include && !existingTxIds.has(r.txId));
  const toSkip = rows.filter((r) => r.include && existingTxIds.has(r.txId));

  if (toInsert.length === 0) {
    return { invoicesCreated: 0, invoicesSkipped: toSkip.length };
  }

  // Upload blob first so we have the URL before DB writes
  const blobResult = await uploadFile({
    name: pdfFile.name,
    data: pdfFile,
    contentType: 'application/pdf',
  });

  // Insert invoices and get their IDs
  const inserted = await db
    .insert(invoices)
    .values(
      toInsert.map((row) => ({
        kind: 'expense' as const,
        scope: 'company' as const,
        concept: row.concept,
        counterpartyName: row.counterpartyName || null,
        expenseGroup: row.expenseGroup,
        expenseSubtype: row.expenseSubtype as (typeof invoices.$inferInsert)['expenseSubtype'],
        netAmount: row.netAmount,
        vatPct: row.vatPct,
        withholdingPct: row.withholdingPct,
        totalAmount: row.totalAmount,
        paidAmount: '0.00',
        currency: 'EUR',
        issueDate: row.issueDate,
        status: row.status,
        txId: row.txId,
        notes: row.notes || null,
        createdByUserId: uploadedByUserId,
      })),
    )
    .returning({ id: invoices.id });

  // Insert one files row per invoice (all pointing to the same blob)
  const filesRows = await db
    .insert(files)
    .values(
      inserted.map((inv) => ({
        name: pdfFile.name,
        type: 'receipt' as const,
        mime: 'application/pdf',
        sizeBytes: blobResult.size,
        url: blobResult.url,
        path: blobResult.pathname,
        relatedType: 'invoice' as const,
        relatedId: inv.id,
        uploadedByUserId,
      })),
    )
    .returning({ id: files.id, relatedId: files.relatedId });

  // Link each invoice to its files row
  for (const fileRow of filesRows) {
    if (fileRow.relatedId != null) {
      await db
        .update(invoices)
        .set({ invoiceFileId: fileRow.id })
        .where(eq(invoices.id, fileRow.relatedId));
    }
  }

  return { invoicesCreated: toInsert.length, invoicesSkipped: toSkip.length };
}
