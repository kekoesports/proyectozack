'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';

import { requireAnyRole } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { INVOICE_IMPORT_TYPES } from '@/lib/files/allowed-types';
import { uploadReasonMessage } from '@/lib/files/reason-messages';
import { hashFile } from '@/lib/utils/hash';
import {
  approveImportSchema,
  commitMappedImportSchema,
  INVOICE_DRAFT_SOURCES,
  type InvoiceDraftSource,
} from '@/lib/schemas/invoiceDraft';
import {
  approveImport,
  createImport,
  createManyImports,
  getImport,
  rejectImport,
  deleteImport,
  deleteAllRejectedImports,
  updateImportDraft,
  DuplicateImportError,
} from '@/lib/queries/invoiceImports';
import { extractXlsxSheet } from '@/lib/parsers/xlsx';
import { extractCsvSheet } from '@/lib/parsers/csv';
import { applyMapping, MAPPABLE_FIELDS, type ColumnMapping } from '@/lib/parsers/common';
import { upsertTemplate } from '@/lib/queries/invoiceImportTemplates';
import { getParserTemplateByNif, upsertParserTemplate } from '@/lib/queries/invoiceParserTemplates';
// pdf.ts / pdfHeuristics.ts / pdfAi.ts use pdfjs-dist which has browser globals at
// module init. Keep them as dynamic imports so they only load when a PDF is uploaded.
type ParsedRegions = import('@/lib/parsers/pdfHeuristics').ParsedRegions;

const REGIONS_KEY = '__regions__';
const EXTRACTION_STATUS_KEY = '__extraction_status__';

function isRateLimitWarning(warnings: readonly string[]): boolean {
  return warnings.some((w) =>
    w.toLowerCase().includes('límite') ||
    w.toLowerCase().includes('quota') ||
    w.toLowerCase().includes('too many') ||
    w.includes('429'),
  );
}

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly importId?: number;
  readonly invoiceId?: number;
};

const EXT_TO_SOURCE: Record<string, InvoiceDraftSource> = {
  pdf: 'pdf-text',
  xlsx: 'xlsx',
  xls: 'xlsx',
  csv: 'csv',
  xml: 'facturae-xml',
};

function inferSourceType(filename: string, mime: string): InvoiceDraftSource | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext in EXT_TO_SOURCE) return EXT_TO_SOURCE[ext] ?? null;
  if (mime === 'application/pdf') return 'pdf-text';
  if (mime === 'text/csv') return 'csv';
  if (mime === 'application/xml' || mime === 'text/xml') return 'facturae-xml';
  return null;
}

async function uploadInvoiceImport(
  file: File,
): Promise<{ ok: true; fileUrl: string; filePath: string } | { ok: false; error: string }> {
  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const blobPath = `invoice-imports/${new Date().getFullYear()}/${Date.now()}-${safeName}`;
  try {
    const blob = await put(blobPath, file, { access: 'private', contentType: file.type });
    return { ok: true, fileUrl: blob.url, filePath: blobPath };
  } catch (err) {
    logRedacted('error', '[invoice-import] upload error:', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al subir el archivo' };
  }
}

export async function uploadImportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Selecciona un archivo' };

  const validation = await validateUploadedFile(file, {
    maxBytes: INVOICE_IMPORT_TYPES.maxBytes,
    allowedMimes: INVOICE_IMPORT_TYPES.mimes,
    allowedExts: INVOICE_IMPORT_TYPES.exts,
  });
  if (!validation.ok) return { error: uploadReasonMessage(validation.reason) };

  const sourceType = inferSourceType(file.name, file.type);
  if (!sourceType || !(INVOICE_DRAFT_SOURCES as readonly string[]).includes(sourceType)) {
    return { error: 'No se pudo identificar el formato del archivo' };
  }

  let fileHash: string;
  try {
    fileHash = await hashFile(file);
  } catch (err) {
    logRedacted('error', '[invoice-import] hash error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al calcular el hash del archivo' };
  }

  const upload = await uploadInvoiceImport(file);
  if (!upload.ok) return { error: upload.error };

  let parsedDraft: Record<string, unknown> | null = null;
  let warningsOut: readonly string[] = [];
  if (sourceType === 'pdf-text') {
    const buf = await file.arrayBuffer();
    logRedacted('info', '[invoice-import] DIAG-0 pdf sourceType=pdf-text mime:', file.type, 'size:', String(file.size));

    // ── Step 1: Gemini AI extraction (no pdfjs dependency) ─────────────────
    // Isolated so pdfjs failures can't prevent AI from running.
    let aiResult: import('@/lib/parsers/pdfAi').PdfAiResult = {
      draft: {}, confidence: {}, warnings: [], usedAi: false,
    };
    try {
      logRedacted('info', '[invoice-import] DIAG-0 loading pdfAi module...');
      const { extractInvoiceWithClaude } = await import('@/lib/parsers/pdfAi');
      logRedacted('info', '[invoice-import] DIAG-0 pdfAi module loaded, calling extractInvoiceWithClaude...');
      aiResult = await extractInvoiceWithClaude(buf);
      logRedacted('info', '[invoice-import] DIAG-0 aiResult usedAi:', String(aiResult.usedAi), 'draftKeys:', Object.keys(aiResult.draft).join(','));
    } catch (err) {
      logRedacted('error', '[invoice-import] DIAG-0 ai extraction THREW:', err instanceof Error ? err.message : 'unknown');
    }

    if (aiResult.usedAi && Object.keys(aiResult.draft).length > 0) {
      // AI succeeded — optionally run pdfjs for bbox regions (template learning).
      let regions: ParsedRegions = {};
      try {
        const { extractPdfText }  = await import('@/lib/parsers/pdf');
        const { parseInvoicePdf } = await import('@/lib/parsers/pdfHeuristics');
        const extract = await extractPdfText(buf);
        regions = parseInvoicePdf(extract).regions;
      } catch {
        // regions optional — template learning skipped
      }
      parsedDraft = { ...aiResult.draft, [REGIONS_KEY]: regions, __confidence__: aiResult.confidence };
      warningsOut = aiResult.warnings;
    } else if (isRateLimitWarning(aiResult.warnings)) {
      // Rate limited: save with flag so user can retry without re-uploading.
      // Do NOT fill any draft fields — avoids wrong defaults in the form.
      parsedDraft = { [EXTRACTION_STATUS_KEY]: 'rate_limited' };
      warningsOut = aiResult.warnings;
    } else if (!process.env.GEMINI_API_KEY) {
      // ── Step 2: Heuristic fallback (pdfjs-based) — only when no AI key ────
      // pdfjs-dist crashes on Vercel (DOMMatrix not available in Node 18).
      // When Gemini is configured but returned empty (quota/error), show the
      // AI warning directly and skip pdfjs to avoid a secondary crash.
      try {
        const { extractPdfText }  = await import('@/lib/parsers/pdf');
        const { parseInvoicePdf } = await import('@/lib/parsers/pdfHeuristics');
        const extract = await extractPdfText(buf);
        const initial = parseInvoicePdf(extract);
        let finalResult = initial;
        if (initial.draft.issuerNif) {
          const tpl = await getParserTemplateByNif(initial.draft.issuerNif);
          if (tpl) {
            finalResult = parseInvoicePdf(extract, {
              template: { regions: tpl.regions, issuerNif: tpl.issuerNif, issuerName: tpl.issuerName },
            });
          }
        }
        parsedDraft = { ...finalResult.draft, [REGIONS_KEY]: finalResult.regions };
        warningsOut = [...aiResult.warnings, ...finalResult.warnings];
      } catch (err) {
        logRedacted('error', '[invoice-import] heuristic parse error:', err instanceof Error ? err.message : 'unknown');
        warningsOut = [...aiResult.warnings, 'No se pudo parsear el PDF automáticamente. Completa los campos manualmente.'];
      }
    } else {
      // Gemini configured but returned no data (quota/network error) — surface AI warnings
      warningsOut = aiResult.warnings.length > 0
        ? aiResult.warnings
        : ['La IA no devolvió datos. Rellena los campos manualmente.'];
    }
  }

  try {
    const row = await createImport({
      sourceType,
      sourceFilename: file.name,
      fileHash,
      fileUrl: upload.fileUrl,
      filePath: upload.filePath,
      parsedDraft,
      warnings: warningsOut,
      createdByUserId: null,
    });
    revalidatePath('/admin/facturacion/import');
    return { success: true, importId: row.id };
  } catch (err) {
    if (err instanceof DuplicateImportError) {
      return { error: `Este archivo ya fue subido (#${err.existingId})` };
    }
    logRedacted('error', '[invoice-import] createImport error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al registrar el import' };
  }
}

export async function approveImportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, approveImportSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[invoice-import] approveImport validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }

  try {
    const existing = await getImport(parsed.data.id);
    const result = await approveImport(parsed.data.id, parsed.data, null);

    // Template learning: if this was a PDF with detected regions and the approved
    // draft has an issuer NIF, persist/update the parser template for that issuer.
    if (
      existing?.sourceType === 'pdf-text' &&
      parsed.data.issuerNif &&
      existing.parsedDraft &&
      typeof existing.parsedDraft === 'object'
    ) {
      const raw = existing.parsedDraft as Record<string, unknown>;
      const regions = raw[REGIONS_KEY];
      if (regions && typeof regions === 'object' && Object.keys(regions).length > 0) {
        try {
          await upsertParserTemplate({
            issuerNif: parsed.data.issuerNif,
            issuerName: parsed.data.issuerName ?? null,
            regions: regions as ParsedRegions,
          });
        } catch (err) {
          logRedacted('error', '[invoice-import] parser template upsert failed:', err instanceof Error ? err.message : 'unknown');
        }
      }
    }

    revalidatePath('/admin/facturacion/import');
    revalidatePath('/admin/facturacion');
    return { success: true, importId: result.importId, invoiceId: result.invoiceId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[invoice-import] approveImport error:', msg);
    return { error: msg };
  }
}

export async function rejectImportAction(id: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  try {
    await rejectImport(id);
    revalidatePath('/admin/facturacion/import');
    return { success: true, importId: id };
  } catch (err) {
    logRedacted('error', '[invoice-import] rejectImport error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al rechazar el import' };
  }
}

export async function deleteImportAction(id: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  try {
    await deleteImport(id);
    revalidatePath('/admin/facturacion/import');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[invoice-import] deleteImport error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar' };
  }
}

export async function clearHistoryAction(): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  try {
    await deleteAllRejectedImports();
    revalidatePath('/admin/facturacion/import');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[invoice-import] clearHistory error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al limpiar historial' };
  }
}

type CommitState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly createdCount?: number;
  readonly skippedCount?: number;
};

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseMappingJson(raw: string): ColumnMapping | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const asRecord = parsed as Record<string, unknown>;
    const out: ColumnMapping = {};
    for (const field of MAPPABLE_FIELDS) {
      const v = asRecord[field];
      if (isInt(v)) out[field] = v;
    }
    return out;
  } catch {
    return null;
  }
}

export async function commitMappedImportAction(
  _prev: CommitState,
  formData: FormData,
): Promise<CommitState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Selecciona un archivo' };

  const validation = await validateUploadedFile(file, {
    maxBytes: INVOICE_IMPORT_TYPES.maxBytes,
    allowedMimes: INVOICE_IMPORT_TYPES.mimes,
    allowedExts: INVOICE_IMPORT_TYPES.exts,
  });
  if (!validation.ok) return { error: uploadReasonMessage(validation.reason) };

  const sourceType = inferSourceType(file.name, file.type);
  if (sourceType !== 'xlsx' && sourceType !== 'csv') {
    return { error: 'Este flujo solo admite XLSX o CSV' };
  }

  const parsed = parseFormData(formData, commitMappedImportSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[invoice-import] commitMappedImport validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }

  const mapping = parseMappingJson(parsed.data.mapping);
  if (!mapping || Object.keys(mapping).length === 0) {
    return { error: 'Mapping inválido: asigna al menos una columna' };
  }
  if (parsed.data.saveAsTemplate && !parsed.data.templateName) {
    return { error: 'Indica un nombre para la plantilla' };
  }

  let fileHash: string;
  try {
    fileHash = await hashFile(file);
  } catch (err) {
    logRedacted('error', '[invoice-import] hash error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al calcular el hash del archivo' };
  }

  let extract: { headers: readonly string[]; rows: readonly (readonly string[])[] };
  try {
    if (sourceType === 'xlsx') {
      const buf = await file.arrayBuffer();
      extract = extractXlsxSheet(buf);
    } else {
      const text = await file.text();
      extract = extractCsvSheet(text);
    }
  } catch (err) {
    logRedacted('error', '[invoice-import] parse error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'No se pudo leer el archivo' };
  }

  if (extract.rows.length === 0) return { error: 'El archivo no tiene filas de datos' };

  const drafts = applyMapping({
    headers: extract.headers,
    rows: extract.rows,
    mapping,
    kind: parsed.data.kind,
    source: sourceType,
  });

  const upload = await uploadInvoiceImport(file);
  if (!upload.ok) return { error: upload.error };

  try {
    const created = await createManyImports({
      sourceType,
      sourceFilename: file.name,
      fileHash,
      fileUrl: upload.fileUrl,
      filePath: upload.filePath,
      createdByUserId: null,
      rows: drafts.map((d, i) => ({
        sourceRowIndex: i,
        parsedDraft: d.draft,
        warnings: d.warnings,
      })),
    });

    if (parsed.data.saveAsTemplate && parsed.data.templateName) {
      await upsertTemplate({
        name: parsed.data.templateName,
        sourceType,
        columnMapping: mapping,
        sampleHeaders: extract.headers,
      });
    }

    revalidatePath('/admin/facturacion/import');
    return {
      success: true,
      createdCount: created.length,
      skippedCount: drafts.length - created.length,
    };
  } catch (err) {
    logRedacted('error', '[invoice-import] commitMappedImport error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al registrar los imports' };
  }
}

// ─── Retry AI extraction (no re-upload) ──────────────────────────────────────

export async function retryExtractionAction(importId: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const existing = await getImport(importId);
  if (!existing || existing.status !== 'pending') {
    return { error: 'Import no encontrado o ya procesado' };
  }
  if (!existing.fileUrl) {
    return { error: 'No hay archivo almacenado para reintentar' };
  }

  logRedacted('info', '[invoice-import] retryExtraction import:', String(importId));

  let buf: ArrayBuffer;
  try {
    const res = await fetch(existing.fileUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = await res.arrayBuffer();
  } catch (err) {
    logRedacted('error', '[invoice-import] retryExtraction fetch failed:', err instanceof Error ? err.message : 'unknown');
    return { error: 'No se pudo obtener el PDF almacenado.' };
  }

  const { extractInvoiceWithClaude } = await import('@/lib/parsers/pdfAi');

  let aiResult = await extractInvoiceWithClaude(buf);

  // Rate limited on first attempt → wait 15s and try once more (max 2 attempts)
  if ((!aiResult.usedAi || Object.keys(aiResult.draft).length === 0) && isRateLimitWarning(aiResult.warnings)) {
    logRedacted('info', '[invoice-import] retryExtraction rate limited — waiting 15s...');
    await new Promise((r) => setTimeout(r, 15_000));
    aiResult = await extractInvoiceWithClaude(buf);
  }

  const prevDraft = (existing.parsedDraft ?? {}) as Record<string, unknown>;

  if (aiResult.usedAi && Object.keys(aiResult.draft).length > 0) {
    // Success — merge with any existing good data, clear the rate-limit flag
    const newDraft: Record<string, unknown> = {
      ...prevDraft,
      ...aiResult.draft,
      __confidence__: aiResult.confidence,
    };
    delete newDraft[EXTRACTION_STATUS_KEY];
    await updateImportDraft(importId, { parsedDraft: newDraft, warnings: aiResult.warnings });
    revalidatePath('/admin/facturacion/import');
    return { success: true, importId };
  }

  // Still failing — keep previous data, refresh the flag
  await updateImportDraft(importId, {
    parsedDraft: { ...prevDraft, [EXTRACTION_STATUS_KEY]: 'rate_limited' },
    warnings: aiResult.warnings,
  });
  revalidatePath('/admin/facturacion/import');
  return {
    error: isRateLimitWarning(aiResult.warnings)
      ? 'Límite de Gemini alcanzado de nuevo. Espera unos minutos e inténtalo otra vez.'
      : (aiResult.warnings[0] ?? 'Extracción fallida'),
  };
}

