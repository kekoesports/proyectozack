'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { upsertTalentFromImport } from '@/lib/queries/talents';
import { parseCsv } from '@/lib/import-utils';

// ── Types ────────────────────────────────────────────────────────────

export type ParseImportFileResult = {
  readonly success: boolean;
  readonly headers?: readonly string[];
  readonly rows?: readonly Record<string, string>[];
  readonly error?: string;
};

export type MappedRow = {
  readonly rowIndex: number;
  readonly raw: Record<string, string>;
  readonly mapped: Record<string, string>;
  /** 'new' | 'update' | 'invalid' */
  readonly status: 'new' | 'update' | 'invalid';
  readonly invalidReason?: string;
  readonly existingId?: number;
};

export type PreviewMappedResult = {
  readonly success: boolean;
  readonly rows?: readonly MappedRow[];
  readonly toCreate?: number;
  readonly toUpdate?: number;
  readonly invalid?: number;
  readonly error?: string;
};

export type ApplyImportInput = {
  readonly rows: readonly Record<string, string>[];
  readonly mapping: Record<string, string>;
  readonly dryRun?: boolean;
};

export type ApplyImportResult = {
  readonly success: boolean;
  readonly created?: number;
  readonly updated?: number;
  readonly skipped?: number;
  readonly errors?: readonly string[];
  readonly error?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────

function parseXlsx(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  // xlsx is in devDependencies — dynamic require to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (jsonRows.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(jsonRows[0]!);
  const rows = jsonRows.map((r) => {
    const row: Record<string, string> = {};
    for (const h of headers) {
      const val = r[h];
      row[h] = val !== null && val !== undefined ? String(val) : '';
    }
    return row;
  });

  return { headers, rows };
}

// ── parseImportFileAction ─────────────────────────────────────────────

export async function parseImportFileAction(formData: FormData): Promise<ParseImportFileResult> {
  await requireRole('admin', '/admin/login');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No se ha subido ningún archivo' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'Archivo demasiado grande (máx 5MB)' };
  }

  const name = file.name.toLowerCase();
  let headers: string[];
  let rows: Record<string, string>[];

  try {
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const parsed = parseXlsx(buffer);
      headers = parsed.headers;
      rows = parsed.rows;
    } else {
      // CSV (default)
      const text = await file.text();
      const parsed = parseCsv(text);
      headers = parsed.headers;
      rows = parsed.rows;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: `Error al parsear el archivo: ${msg}` };
  }

  if (headers.length === 0) {
    return { success: false, error: 'El archivo está vacío o no tiene cabecera' };
  }
  if (rows.length === 0) {
    return { success: false, error: 'El archivo no tiene filas de datos' };
  }

  // Return all rows (preview will show first 5 in the UI)
  return { success: true, headers, rows };
}

// ── applyImportAction ─────────────────────────────────────────────────

export async function applyImportAction(input: ApplyImportInput): Promise<ApplyImportResult> {
  await requireRole('admin', '/admin/login');

  const { rows, mapping, dryRun = false } = input;

  if (!rows || rows.length === 0) {
    return { success: false, error: 'No hay filas para importar' };
  }
  if (!mapping || Object.keys(mapping).length === 0) {
    return { success: false, error: 'No hay mapeo de columnas' };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]!;
    // Apply mapping: build a mapped object with talent field names as keys
    const mapped: Record<string, string> = {};
    for (const [csvHeader, talentField] of Object.entries(mapping)) {
      if (talentField && talentField !== '(ignorar)') {
        mapped[talentField] = raw[csvHeader] ?? '';
      }
    }

    const name = (mapped['name'] ?? '').trim();
    if (!name) {
      errors.push(`Fila ${i + 2}: nombre vacío — omitida`);
      skipped++;
      continue;
    }

    const slug = (mapped['slug'] ?? '').trim();
    if (!slug) {
      errors.push(`Fila ${i + 2}: slug vacío — omitida`);
      skipped++;
      continue;
    }

    if (dryRun) {
      // In dry run, just count — no DB writes
      created++;
      continue;
    }

    try {
      const result = await upsertTalentFromImport({ name, slug, mapped });
      if (result.action === 'created') created++;
      else if (result.action === 'updated') updated++;
      else skipped++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      errors.push(`Fila ${i + 2} ("${name}"): ${msg}`);
      skipped++;
    }
  }

  if (!dryRun) {
    revalidatePath('/admin/talents');
  }

  return { success: true, created, updated, skipped, errors };
}
