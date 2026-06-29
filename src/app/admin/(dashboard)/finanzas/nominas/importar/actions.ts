'use server';

import { requirePermission } from '@/lib/permissions';
import { parsePayrollPdfBuffer, detectMonthFromFilename } from '@/lib/parsers/payrollPdf';
import { getExistingPayrollTxIds, applyPayrollImport } from '@/lib/queries/payrollImport';
import { PayrollImportRowsSchema } from '@/lib/schemas/payroll';
import type { PayrollImportRow, PayrollApplyResult, FilenameWarning } from '@/lib/finance/payroll/types';

export type ParseResult =
  | { ok: true; mode: 'parsed'; rows: PayrollImportRow[]; fileName: string; filenameWarning?: FilenameWarning }
  | { ok: true; mode: 'manual'; pageCount: number; fileName: string; suggestedYearMonth?: string }
  | { ok: false; error: string };

type ApplyResult =
  | { ok: true; result: PayrollApplyResult }
  | { ok: false; error: string };

export async function parsePayrollPdfAction(formData: FormData): Promise<ParseResult> {
  await requirePermission('facturacion', 'write');

  const file = formData.get('pdf');
  if (!(file instanceof File)) return { ok: false, error: 'No se recibió ningún archivo PDF.' };
  if (!file.name.toLowerCase().endsWith('.pdf'))
    return { ok: false, error: 'El archivo debe ser un PDF.' };
  if (file.size > 20 * 1024 * 1024)
    return { ok: false, error: 'El archivo supera 20 MB.' };

  const buffer = await file.arrayBuffer();
  const { rows, pageCount, itemCount, filenameWarning } = await parsePayrollPdfBuffer(buffer, file.name);

  if (pageCount === 0) {
    return { ok: false, error: 'El PDF está vacío o no es un documento válido.' };
  }

  // Also treat as manual when pdfjs extracted some items but none produced useful payroll data.
  // This happens with vectorized PDFs that have a few stray items (page numbers, hidden text)
  // but no actual payroll labels — all rows end up with yearMonth='desconocido' and netAmount='0.00'.
  const allRowsUseless =
    rows.length > 0 &&
    rows.every((r) => r.yearMonth === 'desconocido' && r.netAmount === '0.00');

  if (itemCount === 0 || allRowsUseless) {
    const dateFromFilename = detectMonthFromFilename(file.name);
    const suggestedYearMonth = dateFromFilename
      ? `${dateFromFilename.year}-${String(dateFromFilename.month).padStart(2, '0')}`
      : undefined;
    return {
      ok: true,
      mode: 'manual',
      pageCount,
      fileName: file.name,
      ...(suggestedYearMonth !== undefined ? { suggestedYearMonth } : {}),
    };
  }

  if (rows.length === 0) return { ok: false, error: 'El PDF no contiene páginas reconocibles.' };

  return {
    ok: true,
    mode: 'parsed',
    rows,
    fileName: file.name,
    ...(filenameWarning ? { filenameWarning } : {}),
  };
}

export async function applyPayrollImportAction(formData: FormData): Promise<ApplyResult> {
  const session = await requirePermission('facturacion', 'write');

  const pdfFile = formData.get('pdf');
  if (!(pdfFile instanceof File)) return { ok: false, error: 'Falta el archivo PDF.' };

  const rowsJson = formData.get('rows');
  if (typeof rowsJson !== 'string') return { ok: false, error: 'Faltan las filas a insertar.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rowsJson);
  } catch {
    return { ok: false, error: 'Formato de filas inválido.' };
  }

  const validation = PayrollImportRowsSchema.safeParse(parsed);
  if (!validation.success) {
    return { ok: false, error: `Filas inválidas: ${validation.error.issues[0]?.message ?? 'error de validación'}` };
  }

  const rows: PayrollImportRow[] = validation.data;
  const existingTxIds = await getExistingPayrollTxIds();
  const result = await applyPayrollImport(rows, existingTxIds, pdfFile, session.user.id);

  return { ok: true, result };
}
