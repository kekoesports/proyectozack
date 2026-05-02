'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';

import { requireRole } from '@/lib/auth-guard';
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
  DuplicateImportError,
} from '@/lib/queries/invoiceImports';
import { extractXlsxSheet } from '@/lib/parsers/xlsx';
import { extractCsvSheet } from '@/lib/parsers/csv';
import { applyMapping, MAPPABLE_FIELDS, type ColumnMapping } from '@/lib/parsers/common';
import { upsertTemplate } from '@/lib/queries/invoiceImportTemplates';
import { extractPdfText } from '@/lib/parsers/pdf';
import { parseInvoicePdf, type ParsedRegions } from '@/lib/parsers/pdfHeuristics';
import { getParserTemplateByNif, upsertParserTemplate } from '@/lib/queries/invoiceParserTemplates';

// Internal key used to piggy-back bbox regions on the parsedDraft jsonb column
// so we don't need a dedicated column for template learning.
const REGIONS_KEY = '__regions__';

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
    const blob = await put(blobPath, file, { access: 'public', contentType: file.type });
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
  await requireRole('admin', '/admin/login');

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
    try {
      const buf = await file.arrayBuffer();
      const extract = await extractPdfText(buf);
      const initial = parseInvoicePdf(extract);
      let finalResult = initial;
      if (initial.draft.issuerNif) {
        const tpl = await getParserTemplateByNif(initial.draft.issuerNif);
        if (tpl) {
          finalResult = parseInvoicePdf(extract, {
            template: {
              regions: tpl.regions,
              issuerNif: tpl.issuerNif,
              issuerName: tpl.issuerName,
            },
          });
        }
      }
      parsedDraft = { ...finalResult.draft, [REGIONS_KEY]: finalResult.regions };
      warningsOut = finalResult.warnings;
    } catch (err) {
      logRedacted('error', '[invoice-import] pdf parse error:', err instanceof Error ? err.message : 'unknown');
      warningsOut = ['No se pudo parsear el PDF automáticamente. Completa los campos manualmente.'];
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
  await requireRole('admin', '/admin/login');

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
  await requireRole('admin', '/admin/login');
  try {
    await rejectImport(id);
    revalidatePath('/admin/facturacion/import');
    return { success: true, importId: id };
  } catch (err) {
    logRedacted('error', '[invoice-import] rejectImport error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al rechazar el import' };
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
  await requireRole('admin', '/admin/login');

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
