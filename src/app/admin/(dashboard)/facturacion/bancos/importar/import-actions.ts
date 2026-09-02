'use server';

import { revalidatePath } from 'next/cache';
import {
  financialSecurityErrorMessage,
  requireFinancialSecurity,
} from '@/lib/security/financial-security';
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
  applyWiseBankMapping,
  hashTransaction,
  sanitizeBankRawJson,
} from '@/lib/parsers/bankTransaction';
import {
  createBankImport,
  updateBankImport,
  getBankImportByHash,
  getBankAccount,
  createBankTransaction,
  getBankTransactionByHash,
  logReconciliationEvent,
} from '@/lib/queries/bankReconciliation';
import { getIssuerCompany } from '@/lib/queries/issuedInvoices';
import type { BankColumnMapping } from '@/lib/parsers/bankTransaction';

const ELEVATEX_TAX_ID = 'B21821046';

async function validateWiseImportAccount(formData: FormData): Promise<{
  readonly error?: string;
  readonly account?: NonNullable<Awaited<ReturnType<typeof getBankAccount>>>;
}> {
  if (formData.get('sourceFormat') !== 'wise') return {};
  const accountId = Number(formData.get('bankAccountId'));
  if (!Number.isInteger(accountId) || accountId < 1) {
    return { error: 'Selecciona una cuenta Wise de ELEVATEX' };
  }
  const account = await getBankAccount(accountId);
  if (!account || account.provider !== 'wise' || account.issuerCompanyId === null) {
    return { error: 'La cuenta seleccionada no es una cuenta Wise válida' };
  }
  const issuer = await getIssuerCompany(account.issuerCompanyId);
  if (!issuer || issuer.taxId?.toUpperCase() !== ELEVATEX_TAX_ID) {
    return { error: 'Wise solo puede importarse en la contabilidad de ELEVATEX AGENCY PA SL' };
  }
  return { account };
}

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly importId?: number;
  readonly totalRows?: number;
  readonly importedRows?: number;
  readonly duplicateRows?: number;
};

function isCsvFile(file: File): boolean {
  return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
}

// Step 1: upload file → return headers so the user can map columns
export async function analyzeImportFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { readonly headers?: readonly string[]; readonly suggestedMapping?: BankColumnMapping }> {
  try {
    await requireFinancialSecurity('write');

    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No se recibió ningún archivo' };

    const validation = await validateUploadedFile(file, {
      maxBytes: BANK_IMPORT_TYPES.maxBytes,
      allowedMimes: [...BANK_IMPORT_TYPES.mimes],
      allowedExts: [...BANK_IMPORT_TYPES.exts],
    });
    if (!validation.ok) return { error: `Archivo no válido: ${validation.reason}` };

    const wiseAccount = await validateWiseImportAccount(formData);
    if (wiseAccount.error) return { error: wiseAccount.error };

    let headers: readonly string[];
    if (isCsvFile(file)) {
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
    const securityMessage = financialSecurityErrorMessage(err);
    if (securityMessage) return { error: securityMessage };
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
    const session = await requireFinancialSecurity('write');

    const file = formData.get('file');
    if (!(file instanceof File)) return { error: 'No se recibió ningún archivo' };

    const validation = await validateUploadedFile(file, {
      maxBytes: BANK_IMPORT_TYPES.maxBytes,
      allowedMimes: [...BANK_IMPORT_TYPES.mimes],
      allowedExts: [...BANK_IMPORT_TYPES.exts],
    });
    if (!validation.ok) return { error: `Archivo no válido: ${validation.reason}` };

    const wiseAccount = await validateWiseImportAccount(formData);
    if (wiseAccount.error) return { error: wiseAccount.error };

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

    if (isCsvFile(file)) {
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

    const parsedRows = wiseAccount.account
      ? applyWiseBankMapping({ headers, rows, mapping, defaultCurrency: wiseAccount.account.currency })
      : applyBankMapping({ headers, rows, mapping, defaultCurrency: 'EUR' });
    const totalRows = parsedRows.length;

    if (wiseAccount.account) {
      const mismatchedCurrency = parsedRows.find((row) => row.currency !== wiseAccount.account?.currency);
      if (mismatchedCurrency) {
        return {
          error: `El extracto contiene ${mismatchedCurrency.currency}, pero la cuenta Wise seleccionada es ${wiseAccount.account.currency}. Importa cada divisa en su cuenta correspondiente.`,
        };
      }
    }

    // Create import record
    const bankImport = await createBankImport({
      ...(bankAccountId !== null ? { bankAccountId } : {}),
      sourceType: isCsvFile(file) ? 'csv' : 'xlsx',
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
        ...(row.externalId !== null ? { externalId: row.externalId } : {}),
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
        ...(row.originalAmount !== null ? { originalAmount: row.originalAmount.toString() } : {}),
        ...(row.originalCurrency !== null ? { originalCurrency: row.originalCurrency } : {}),
        ...(row.conversionRate !== null ? { conversionRate: row.conversionRate.toString() } : {}),
        ...(row.fxFee !== null ? { fxFee: row.fxFee.toString() } : {}),
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
    const securityMessage = financialSecurityErrorMessage(err);
    if (securityMessage) return { error: securityMessage };
    logRedacted('error', 'uploadAndImportAction', err);
    return { error: 'Error al importar el archivo bancario' };
  }
}
