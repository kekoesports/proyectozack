'use server';

import { requirePermission } from '@/lib/permissions';
import { parsePayrollPdfBuffer } from '@/lib/parsers/payrollPdf';
import { getExistingPayrollTxIds, applyPayrollImport } from '@/lib/queries/payrollImport';
import type { PayrollImportRow, PayrollApplyResult } from '@/lib/finance/payroll/types';

type ParseResult =
  | { ok: true; rows: PayrollImportRow[]; fileName: string }
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
  const { rows, pageCount, itemCount } = await parsePayrollPdfBuffer(buffer, file.name);

  if (itemCount === 0 && pageCount > 0) {
    return {
      ok: false,
      error:
        `El PDF (${pageCount} página${pageCount > 1 ? 's' : ''}) no contiene texto extraíble — ` +
        'es un PDF de imagen o escaneado, el parser no puede leerlo. ' +
        'Pide a ELEVATEX el PDF en formato texto nativo (exportado directamente del software de nóminas, no impreso/escaneado). ' +
        'Mientras tanto puedes introducir la nómina manualmente en Finanzas › Gastos.',
    };
  }

  if (rows.length === 0) return { ok: false, error: 'El PDF no contiene páginas reconocibles.' };

  return { ok: true, rows, fileName: file.name };
}

export async function applyPayrollImportAction(formData: FormData): Promise<ApplyResult> {
  const session = await requirePermission('facturacion', 'write');

  const pdfFile = formData.get('pdf');
  if (!(pdfFile instanceof File)) return { ok: false, error: 'Falta el archivo PDF.' };

  const rowsJson = formData.get('rows');
  if (typeof rowsJson !== 'string') return { ok: false, error: 'Faltan las filas a insertar.' };

  let rows: PayrollImportRow[];
  try {
    rows = JSON.parse(rowsJson) as PayrollImportRow[];
  } catch {
    return { ok: false, error: 'Formato de filas inválido.' };
  }

  const existingTxIds = await getExistingPayrollTxIds();
  const result = await applyPayrollImport(rows, existingTxIds, pdfFile, session.user.id);

  return { ok: true, result };
}
