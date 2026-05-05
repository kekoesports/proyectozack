import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoiceImports, invoices } from '@/db/schema';
import { createInvoice } from './invoices';
import { draftToInvoiceInsert, type ApproveImportInput } from '@/lib/schemas/invoiceDraft';
import type {
  InvoiceImport,
  InvoiceImportStatus,
  InvoiceImportWithDraft,
  NewInvoiceImport,
} from '@/types';

function asImportWithDraft(row: InvoiceImport): InvoiceImportWithDraft {
  return {
    ...row,
    parsedDraft: row.parsedDraft as InvoiceImportWithDraft['parsedDraft'],
    warnings: row.warnings as InvoiceImportWithDraft['warnings'],
  };
}

/**
 * Lista los imports de facturas (con su draft parseado), opcionalmente filtrados por estado.
 * Ordenados por `createdAt DESC, id DESC`.
 *
 * @cache none
 * @visibility admin
 * @returns array de `InvoiceImportWithDraft`.
 */
export async function listImports(
  status?: InvoiceImportStatus,
): Promise<readonly InvoiceImportWithDraft[]> {
  const rows = await db
    .select()
    .from(invoiceImports)
    .where(status ? eq(invoiceImports.status, status) : undefined)
    .orderBy(desc(invoiceImports.createdAt), desc(invoiceImports.id));
  return rows.map(asImportWithDraft);
}

/**
 * Devuelve un import de factura por id, con su draft tipado.
 *
 * @cache none
 * @visibility admin
 * @returns `InvoiceImportWithDraft` o `null` si no existe.
 */
export async function getImport(id: number): Promise<InvoiceImportWithDraft | null> {
  const [row] = await db
    .select()
    .from(invoiceImports)
    .where(eq(invoiceImports.id, id))
    .limit(1);
  return row ? asImportWithDraft(row) : null;
}

/**
 * Busca un import por (`fileHash`, `sourceRowIndex`) — usado para detectar duplicados.
 *
 * @cache none
 * @visibility admin
 * @returns `InvoiceImport` o `null`.
 */
export async function getImportByHash(
  fileHash: string,
  sourceRowIndex = -1,
): Promise<InvoiceImport | null> {
  const [row] = await db
    .select()
    .from(invoiceImports)
    .where(
      and(
        eq(invoiceImports.fileHash, fileHash),
        eq(invoiceImports.sourceRowIndex, sourceRowIndex),
      ),
    )
    .limit(1);
  return row ?? null;
}

export class DuplicateImportError extends Error {
  readonly existingId: number;
  constructor(existingId: number) {
    super('Este archivo ya fue subido previamente');
    this.name = 'DuplicateImportError';
    this.existingId = existingId;
  }
}

type CreateImportArgs = {
  readonly sourceType: NewInvoiceImport['sourceType'];
  readonly sourceFilename: string;
  readonly fileHash: string;
  readonly sourceRowIndex?: number;
  readonly fileUrl: string | null;
  readonly filePath: string | null;
  readonly parsedDraft?: NewInvoiceImport['parsedDraft'];
  readonly confidence?: number | null;
  readonly warnings?: readonly string[];
  readonly createdByUserId: string | null;
};

/**
 * Crea un import de factura. Lanza `DuplicateImportError` si ya existe un import con
 * el mismo `(fileHash, sourceRowIndex)`.
 *
 * @cache none
 * @visibility admin
 * @returns la fila `InvoiceImport` creada.
 */
export async function updateImportDraft(
  id: number,
  patch: { parsedDraft: Record<string, unknown>; warnings: readonly string[] },
): Promise<void> {
  await db
    .update(invoiceImports)
    .set({ parsedDraft: patch.parsedDraft, warnings: [...patch.warnings] })
    .where(and(eq(invoiceImports.id, id), eq(invoiceImports.status, 'pending')));
}

export async function deleteImport(id: number): Promise<void> {
  await db.delete(invoiceImports).where(eq(invoiceImports.id, id));
}

export async function deleteAllRejectedImports(): Promise<void> {
  await db.delete(invoiceImports).where(eq(invoiceImports.status, 'rejected'));
}

export async function createImport(args: CreateImportArgs): Promise<InvoiceImport> {
  const rowIndex = args.sourceRowIndex ?? -1;
  const existing = await getImportByHash(args.fileHash, rowIndex);
  if (existing) {
    // Allow re-upload of rejected imports — delete the old record and proceed
    if (existing.status === 'rejected') {
      await db.delete(invoiceImports).where(eq(invoiceImports.id, existing.id));
    } else {
      throw new DuplicateImportError(existing.id);
    }
  }

  const [row] = await db
    .insert(invoiceImports)
    .values({
      sourceType: args.sourceType,
      sourceFilename: args.sourceFilename,
      fileHash: args.fileHash,
      sourceRowIndex: rowIndex,
      fileUrl: args.fileUrl,
      filePath: args.filePath,
      parsedDraft: args.parsedDraft ?? null,
      confidence: args.confidence ?? null,
      warnings: args.warnings ? [...args.warnings] : null,
      createdByUserId: args.createdByUserId,
    })
    .returning();
  if (!row) throw new Error('Failed to insert invoice import');
  return row;
}

type CreateManyImportsArgs = {
  readonly sourceType: NewInvoiceImport['sourceType'];
  readonly sourceFilename: string;
  readonly fileHash: string;
  readonly fileUrl: string | null;
  readonly filePath: string | null;
  readonly rows: readonly {
    readonly sourceRowIndex: number;
    readonly parsedDraft: NewInvoiceImport['parsedDraft'];
    readonly warnings: readonly string[];
  }[];
  readonly createdByUserId: string | null;
};

/**
 * Inserta múltiples imports en bulk (un row index por fila del fichero), ignorando
 * duplicados existentes en la combinación `(fileHash, sourceRowIndex)`.
 *
 * @cache none
 * @visibility admin
 * @returns array de los imports realmente insertados (puede ser menor que `args.rows`).
 */
export async function createManyImports(
  args: CreateManyImportsArgs,
): Promise<readonly InvoiceImport[]> {
  if (args.rows.length === 0) return [];
  const values = args.rows.map((r) => ({
    sourceType: args.sourceType,
    sourceFilename: args.sourceFilename,
    fileHash: args.fileHash,
    sourceRowIndex: r.sourceRowIndex,
    fileUrl: args.fileUrl,
    filePath: args.filePath,
    parsedDraft: r.parsedDraft,
    warnings: r.warnings.length > 0 ? [...r.warnings] : null,
    createdByUserId: args.createdByUserId,
  }));
  return db
    .insert(invoiceImports)
    .values(values)
    .onConflictDoNothing({
      target: [invoiceImports.fileHash, invoiceImports.sourceRowIndex],
    })
    .returning();
}

/**
 * Aprueba un import pendiente: crea la factura definitiva a partir del draft final
 * y marca el import como `approved` (sólo si seguía `pending`).
 *
 * @cache none
 * @visibility admin
 * @returns `{ importId, invoiceId }`.
 */
export async function approveImport(
  id: number,
  finalDraft: ApproveImportInput,
  createdByUserId: string | null,
): Promise<{ readonly importId: number; readonly invoiceId: number }> {
  const existing = await getImport(id);
  if (!existing) throw new Error('Import no encontrado');
  if (existing.status !== 'pending') throw new Error('Este import ya fue revisado');

  const invoice = await createInvoice({
    ...draftToInvoiceInsert(finalDraft, createdByUserId),
    fileUrl: existing.fileUrl,
    filePath: existing.filePath,
  });

  await db
    .update(invoiceImports)
    .set({
      status: 'approved',
      invoiceId: invoice.id,
      reviewedAt: new Date(),
    })
    .where(and(eq(invoiceImports.id, id), eq(invoiceImports.status, 'pending')));

  return { importId: id, invoiceId: invoice.id };
}

/**
 * Rechaza un import pendiente (`status -> 'rejected'`, `reviewedAt = now`).
 * Idempotente: sólo afecta a imports en `status = 'pending'`.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function rejectImport(id: number): Promise<void> {
  await db
    .update(invoiceImports)
    .set({ status: 'rejected', reviewedAt: new Date() })
    .where(and(eq(invoiceImports.id, id), eq(invoiceImports.status, 'pending')));
}

/**
 * Cuenta imports en estado `pending` — usado por el badge del nav admin.
 *
 * Nota: usa `select id + .length` en lugar de `count(*)`. Funciona pero es ineficiente
 * con muchos imports.
 *
 * @cache none
 * @visibility admin
 * @returns número de imports pendientes de revisión.
 */
export async function countPendingImports(): Promise<number> {
  const rows = await db
    .select({ id: invoiceImports.id })
    .from(invoiceImports)
    .where(eq(invoiceImports.status, 'pending'));
  return rows.length;
}

// Re-export for server actions that need to check generated invoice existence.
export { invoices };
