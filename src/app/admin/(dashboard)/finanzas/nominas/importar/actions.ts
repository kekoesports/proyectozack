'use server';

import { requirePermission } from '@/lib/permissions';
import { parsePayrollPdfBuffer, detectMonthFromFilename } from '@/lib/parsers/payrollPdf';
import { ocrPayrollPdf } from '@/lib/parsers/payrollOcr';
import type { OcrPayrollResult } from '@/lib/parsers/payrollOcr';
import { getExistingPayrollTxIds, applyPayrollImport } from '@/lib/queries/payrollImport';
import { PayrollImportRowsSchema } from '@/lib/schemas/payroll';
import type { PayrollImportRow, PayrollApplyResult, FilenameWarning } from '@/lib/finance/payroll/types';
import { env } from '@/lib/env';
import { logRedacted } from '@/lib/log';

// Timeout interno: deja 5 s de margen antes de que Vercel mate la función a los 60 s.
// Devuelve una promesa que nunca resuelve — solo rechaza con 'ocr_timeout' al cumplirse el delay.
function ocrTimeoutRace(): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('ocr_timeout')), 55_000),
  );
}

export type ParseResult =
  | { ok: true; mode: 'parsed'; rows: PayrollImportRow[]; fileName: string; filenameWarning?: FilenameWarning }
  | { ok: true; mode: 'needs-ocr'; pageCount: number; fileName: string; suggestedYearMonth?: string }
  | { ok: false; error: string };

type ApplyResult =
  | { ok: true; result: PayrollApplyResult }
  | { ok: false; error: string };

type OcrResult =
  | { ok: true; rows: PayrollImportRow[]; fileName: string }
  | { ok: false; error: string };

export async function parsePayrollPdfAction(formData: FormData): Promise<ParseResult> {
  // Blindaje total: cualquier excepción (incluida la inicialización de pdfjs-dist
  // que ha fallado en producción con DOMMatrix/worker errors) cae en el catch
  // y devuelve un mensaje genérico al usuario, sin tirar el RSC fetch.
  try {
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

    // A row is only valid when it has ALL THREE: real employee name, known period, coste empresa > 0.
    // Missing ANY ONE makes the row useless. Vectorized PDFs may extract stray amounts without labels
    // (netAmount non-zero but yearMonth='desconocido') — the old AND condition missed those cases.
    function isRowUseless(r: PayrollImportRow): boolean {
      return !r.counterpartyName.trim() || r.yearMonth === 'desconocido' || Number(r.netAmount) <= 0;
    }
    const allRowsUseless = rows.length > 0 && rows.every(isRowUseless);

    if (itemCount === 0 || allRowsUseless) {
      const dateFromFilename = detectMonthFromFilename(file.name);
      const suggestedYearMonth = dateFromFilename
        ? `${dateFromFilename.year}-${String(dateFromFilename.month).padStart(2, '0')}`
        : undefined;
      return {
        ok: true,
        mode: 'needs-ocr',
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
  } catch (err) {
    logRedacted('error', '[payroll-parse] step=failed', err);
    return {
      ok: false,
      error: 'No se pudo leer el PDF automáticamente. Puedes introducir los datos manualmente.',
    };
  }
}

export async function ocrPayrollPdfAction(formData: FormData): Promise<OcrResult> {
  // Blindaje total: nunca debe burbujear excepción al cliente (rompería el RSC).
  try {
    await requirePermission('facturacion', 'write');

    // Kill switch: si PAYROLL_OCR_ENABLED no es 'true' (default en prod),
    // no se carga tesseract.js — devolvemos error controlado para que el wizard
    // muestre el modo manual sin tirar la página.
    if (!env.PAYROLL_OCR_ENABLED) {
      logRedacted('info', '[ocr-payroll] step=disabled');
      return {
        ok: false,
        error: 'OCR automático deshabilitado temporalmente. Puedes introducir los datos manualmente.',
      };
    }

    const file = formData.get('pdf');
    if (!(file instanceof File)) return { ok: false, error: 'No se recibió ningún archivo PDF.' };
    if (!file.name.toLowerCase().endsWith('.pdf'))
      return { ok: false, error: 'El archivo debe ser un PDF.' };
    if (file.size > 20 * 1024 * 1024)
      return { ok: false, error: 'El archivo supera 20 MB.' };

    const buffer = await file.arrayBuffer();
    const startMs = Date.now();
    console.log('[ocr-payroll] step=start');

    let result: OcrPayrollResult;
    try {
      result = await Promise.race([ocrPayrollPdf(buffer, file.name), ocrTimeoutRace()]);
    } catch (err) {
      const elapsed = Date.now() - startMs;
      const isTimeout = err instanceof Error && err.message === 'ocr_timeout';
      logRedacted('error', '[ocr-payroll] step=failed', {
        step: isTimeout ? 'timeout' : 'error',
        elapsedMs: elapsed,
      });
      return {
        ok: false,
        error: 'No se pudo completar el OCR. Puedes introducir los datos manualmente.',
      };
    }

    const elapsed = Date.now() - startMs;
    const { rows, pageCount } = result;
    console.log('[ocr-payroll] step=done', { elapsedMs: elapsed, pageCount, rowCount: rows.length });

    if (pageCount === 0) return { ok: false, error: 'El PDF está vacío o no es un documento válido.' };
    if (rows.length === 0) return { ok: false, error: 'OCR no pudo reconocer páginas en el PDF.' };

    return { ok: true, rows, fileName: file.name };
  } catch (err) {
    logRedacted('error', '[ocr-payroll] step=failed-outer', err);
    return {
      ok: false,
      error: 'No se pudo completar el OCR. Puedes introducir los datos manualmente.',
    };
  }
}

export async function applyPayrollImportAction(formData: FormData): Promise<ApplyResult> {
  // Blindaje total: blob/DB errors quedan controlados.
  try {
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
  } catch (err) {
    logRedacted('error', '[payroll-apply] step=failed', err);
    return {
      ok: false,
      error: 'No se pudo guardar la importación. Revisa los datos e inténtalo de nuevo.',
    };
  }
}
