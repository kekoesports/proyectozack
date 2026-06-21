'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { BANK_IMPORT_TYPES } from '@/lib/files/allowed-types';
import { hashFile } from '@/lib/utils/hash';
import { bankColumnMappingSchema } from '@/lib/schemas/bankReconciliation';
import {
  parseBankCsv,
  parseBankXlsx,
  suggestBankMapping,
  applyBankMapping,
  hashTransaction,
  sanitizeBankRawJson,
} from '@/lib/parsers/bankTransaction';
import {
  createBankImport,
  updateBankImport,
  getBankImportByHash,
  createBankTransaction,
  getBankTransactionByHash,
  logReconciliationEvent,
} from '@/lib/queries/bankReconciliation';
import type { BankColumnMapping } from '@/lib/parsers/bankTransaction';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly importId?: number;
  readonly totalRows?: number;
  readonly importedRows?: number;
  readonly duplicateRows?: number;
};

// Step 1: upload file → return headers so the user can map columns
export async function analyzeImportFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { readonly headers?: readonly string[]; readonly suggestedMapping?: BankColumnMapping }> {
  try {
    await requirePermission('bancos', 'write');

    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No se recibió ningún archivo' };

    const validation = await validateUploadedFile(file, {
      maxBytes: BANK_IMPORT_TYPES.maxBytes,
      allowedMimes: [...BANK_IMPORT_TYPES.mimes],
      allowedExts: [...BANK_IMPORT_TYPES.exts],
    });
    if (!validation.ok) return { error: `Archivo no válido: ${validation.reason}` };

    let headers: readonly string[];
    if (file.type === 'text/csv') {
      const text = await file.text();
      const sheet = parseBankCsv(text);
      headers = sheet.headers;
    } else {
      const buffer = await file.arrayBuffer();
      const sheet = parseBankXlsx(buffer);
      headers = sheet.headers;
    }

    if (headers.length === 0) return { error: 'El archivo no contiene encabezados' };

    const suggestedMapping = suggestBankMapping(headers);
    return { success: true, headers, suggestedMapping };
  } catch (err) {
    logRedacted('error', 'analyzeImportFileAction', err);
    return { error: 'Error al analizar el archivo' };
  }
}

// Step 2: parse with confirmed mapping → persist transactions
export async function uploadAndImportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission('bancos', 'write');

    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No se recibió ningún archivo' };

    const validation = await validateUploadedFile(file, {
      maxBytes: BANK_IMPORT_TYPES.maxBytes,
      allowedMimes: [...BANK_IMPORT_TYPES.mimes],
      allowedExts: [...BANK_IMPORT_TYPES.exts],
    });
    if (!validation.ok) return { error: `Archivo no válido: ${validation.reason}` };

    const rawMapping = Object.fromEntries(formData);
    const parsedMapping = bankColumnMappingSchema.safeParse(rawMapping);
    if (!parsedMapping.success) return { error: 'Mapeo de columnas inválido' };

    // Filter undefined values — exactOptionalPropertyTypes requires absence, not undefined
    const mapping: BankColumnMapping = Object.fromEntries(
      Object.entries(parsedMapping.data).filter(([, v]) => v !== undefined),
    ) as BankColumnMapping;
    const bankAccountIdRaw = formData.get('bankAccountId');
    const bankAccountId = bankAccountIdRaw ? Number(bankAccountIdRaw) : null;
    const fileHash = await hashFile(file);

    // Dedup: same file + same account already imported?
    const existing = await getBankImportByHash(fileHash, bankAccountId);
    if (existing) {
      return { error: `Este archivo ya fue importado (import #${existing.id})` };
    }

    // Parse file content
    let headers: readonly string[];
    let rows: readonly (readonly string[])[];

    if (file.type === 'text/csv') {
      const text = await file.text();
      const sheet = parseBankCsv(text);
      headers = sheet.headers;
      rows = sheet.rows;
    } else {
      const buffer = await file.arrayBuffer();
      const sheet = parseBankXlsx(buffer);
      headers = sheet.headers;
      rows = sheet.rows;
    }

    const parsedRows = applyBankMapping({ headers, rows, mapping, defaultCurrency: 'EUR' });
    const totalRows = parsedRows.length;

    // Create import record
    const bankImport = await createBankImport({
      ...(bankAccountId !== null ? { bankAccountId } : {}),
      sourceType: file.type === 'text/csv' ? 'csv' : 'xlsx',
      sourceFilename: file.name,
      fileHash,
      status: 'pending',
      totalRows,
      importedRows: 0,
      duplicateRows: 0,
      createdByUserId: session.user.id,
    });

    let importedRows = 0;
    let duplicateRows = 0;

    for (const row of parsedRows) {
      const txHash = hashTransaction(row, bankAccountId);
      const existing = await getBankTransactionByHash(txHash, bankAccountId);
      if (existing) {
        duplicateRows += 1;
        continue;
      }

      const rawJson = sanitizeBankRawJson(row.rawFields);

      await createBankTransaction({
        ...(bankAccountId !== null ? { bankAccountId } : {}),
        importId: bankImport.id,
        transactionHash: txHash,
        bookingDate: row.bookingDate,
        ...(row.valueDate !== null ? { valueDate: row.valueDate } : {}),
        amount: row.amount.toString(),
        currency: row.currency,
        direction: row.direction,
        description: row.description,
        ...(row.counterpartyName !== null ? { counterpartyName: row.counterpartyName } : {}),
        ...(row.counterpartyAccountMasked !== null ? { counterpartyAccountMasked: row.counterpartyAccountMasked } : {}),
        ...(row.reference !== null ? { reference: row.reference } : {}),
        ...(row.category !== null ? { category: row.category } : {}),
        status: 'imported',
        rawJsonSanitized: rawJson,
      });

      importedRows += 1;
    }

    // Update import record with results
    await updateBankImport(bankImport.id, {
      status: 'processed',
      importedRows,
      duplicateRows,
      processedAt: new Date(),
    });

    await logReconciliationEvent({
      eventType: 'import_completed',
      message: `Importación completada: ${importedRows} nuevas, ${duplicateRows} duplicadas de ${totalRows} filas`,
      metadata: { importId: bankImport.id, totalRows, importedRows, duplicateRows },
      createdByUserId: session.user.id,
    });

    revalidatePath('/admin/facturacion/bancos');
    revalidatePath('/admin/facturacion/bancos/conciliacion');

    return { success: true, importId: bankImport.id, totalRows, importedRows, duplicateRows };
  } catch (err) {
    logRedacted('error', 'uploadAndImportAction', err);
    return { error: 'Error al importar el archivo bancario' };
  }
}
