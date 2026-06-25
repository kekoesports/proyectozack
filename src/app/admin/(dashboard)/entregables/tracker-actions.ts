'use server';

import { requirePermission } from '@/lib/permissions';
import { createTrackerSchema, reviewTrackerItemSchema, importLinksSchema } from '@/lib/schemas/deal-tracker';
import {
  createTracker,
  importTrackerItems,
  reviewTrackerItem,
  approveTracker,
  updateTrackerTarget,
  deleteTracker,
} from '@/lib/queries/deal-trackers';
import { extractXlsxSheet } from '@/lib/parsers/xlsx';
import { extractCsvSheet } from '@/lib/parsers/csv';
import { parseAnyDate } from '@/lib/parsers/common';
import {
  extractSpreadsheetId,
  fetchSpreadsheetMetadata,
  readSheetGrid,
  validateGoogleSheetUrl,
} from '@/lib/integrations/google-sheets';
import { revalidatePath } from 'next/cache';
import type { ParsedLinkRow } from '@/lib/schemas/deal-tracker';

type ActionResult = { ok: true } | { ok: false; error: string };

// ── fetchSheetTitleAction ─────────────────────────────────────────────────────
// Auto-detect sheet title to pre-fill the deal name in the creation form.

export async function fetchSheetTitleAction(sheetUrl: string): Promise<
  { ok: true; title: string } | { ok: false; error: string }
> {
  await requirePermission('campanas', 'write');
  if (!validateGoogleSheetUrl(sheetUrl)) return { ok: false, error: 'URL de Google Sheets inválida' };
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) return { ok: false, error: 'No se pudo extraer el ID del spreadsheet' };
  try {
    const { title } = await fetchSpreadsheetMetadata(spreadsheetId);
    return { ok: true, title };
  } catch {
    return { ok: false, error: 'No se pudo leer la hoja (¿es pública?)' };
  }
}

// ── createTrackerAction ───────────────────────────────────────────────────────

export async function createTrackerAction(formData: FormData): Promise<ActionResult & { id?: number }> {
  const session = await requirePermission('campanas', 'write');

  const parsed = createTrackerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  try {
    const tracker = await createTracker(parsed.data, session.user.id);
    revalidatePath('/admin/entregables');
    return { ok: true, id: tracker.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al crear tracker' };
  }
}

// ── parseTrackerFileAction ────────────────────────────────────────────────────
// Returns preview headers so client can map columns before importing.

export async function parseTrackerFileAction(formData: FormData): Promise<
  { ok: true; headers: string[]; rowCount: number; fileName: string } | { ok: false; error: string }
> {
  await requirePermission('campanas', 'write');

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'Archivo no recibido' };

  const bytes = await file.arrayBuffer();
  const fileName = file.name;

  try {
    let headers: readonly string[];
    let rows: readonly (readonly string[])[];

    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
      const text = new TextDecoder('utf-8').decode(bytes);
      const sheet = extractCsvSheet(text);
      headers = sheet.headers;
      rows = sheet.rows;
    } else {
      const sheet = extractXlsxSheet(Buffer.from(bytes));
      headers = sheet.headers;
      rows = sheet.rows;
    }

    return { ok: true, headers: [...headers], rowCount: rows.length, fileName };
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo' };
  }
}

// ── importTrackerLinksAction ──────────────────────────────────────────────────

export async function importTrackerLinksAction(formData: FormData): Promise<
  ActionResult & { inserted?: number; duplicates?: number; invalid?: number }
> {
  await requirePermission('campanas', 'write');

  const parsed = importLinksSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { trackerId, sourceFile, linkColumn, dateColumn, notesColumn } = parsed.data;

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'Archivo no recibido' };

  const bytes = await file.arrayBuffer();
  const fileName = file.name;

  try {
    let headers: readonly string[];
    let rawRows: readonly (readonly string[])[];

    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
      const text = new TextDecoder('utf-8').decode(bytes);
      const sheet = extractCsvSheet(text);
      headers = sheet.headers;
      rawRows = sheet.rows;
    } else {
      const sheet = extractXlsxSheet(Buffer.from(bytes));
      headers = sheet.headers;
      rawRows = sheet.rows;
    }

    const linkColIdx = headers.indexOf(linkColumn);
    if (linkColIdx < 0) return { ok: false, error: `Columna "${linkColumn}" no encontrada` };

    const dateColIdx  = dateColumn  ? headers.indexOf(dateColumn)  : -1;
    const notesColIdx = notesColumn ? headers.indexOf(notesColumn) : -1;

    const rows: ParsedLinkRow[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;
      const url = (row[linkColIdx] ?? '').trim();
      if (!url) continue;
      const rawDate = dateColIdx >= 0 ? (row[dateColIdx] ?? '').trim() : '';
      const contentDate = rawDate ? (parseAnyDate(rawDate) ?? undefined) : undefined;
      const notes = notesColIdx >= 0 ? ((row[notesColIdx] ?? '').trim() || undefined) : undefined;
      rows.push({ originalUrl: url, contentDate, notes, sourceRowIndex: i + 1 });
    }

    const result = await importTrackerItems(trackerId, rows, sourceFile || fileName);

    revalidatePath(`/admin/entregables/${trackerId}`);
    return { ok: true, inserted: result.inserted, duplicates: result.duplicatesSkipped, invalid: result.invalidSkipped };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al importar' };
  }
}

// ── detectTargetFromGrid ──────────────────────────────────────────────────────
// Scans cell content for patterns like "12x preroll + 5x video" → 17
// or "15 streams", "10 videos". Returns null if nothing found.

function detectTargetFromGrid(grid: string[][]): number | null {
  const WITH_X   = /(\d+)\s*x\s+\w/gi;
  const BARE_NUM = /(\d+)\s+(?:videos?|streams?|prerolls?|posts?|stories|reels?|shorts?|clips?)/gi;

  for (const row of grid) {
    for (const cell of row) {
      if (!cell) continue;
      // Pattern "Nx word" (e.g. "12x preroll + 5x video")
      const xMatches = [...cell.matchAll(WITH_X)];
      if (xMatches.length > 0) {
        const total = xMatches.reduce((sum, m) => sum + parseInt(m[1]!, 10), 0);
        if (total > 0) return total;
      }
      // Pattern "N videos/streams/…"
      const bareMatches = [...cell.matchAll(BARE_NUM)];
      if (bareMatches.length > 0) {
        const total = bareMatches.reduce((sum, m) => sum + parseInt(m[1]!, 10), 0);
        if (total > 0) return total;
      }
    }
  }
  return null;
}

// ── deleteTrackerAction ───────────────────────────────────────────────────────

export async function deleteTrackerAction(formData: FormData): Promise<ActionResult> {
  await requirePermission('campanas', 'write');

  const trackerId = Number(formData.get('trackerId'));
  if (!trackerId || isNaN(trackerId)) return { ok: false, error: 'trackerId inválido' };

  try {
    await deleteTracker(trackerId);
    revalidatePath('/admin/entregables');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al eliminar tracker' };
  }
}

// ── syncTrackerFromSheetUrlAction ─────────────────────────────────────────────

export async function syncTrackerFromSheetUrlAction(formData: FormData): Promise<
  ActionResult & { inserted?: number; duplicates?: number }
> {
  await requirePermission('campanas', 'write');

  const trackerId = Number(formData.get('trackerId'));
  const sheetUrl  = String(formData.get('sheetUrl') ?? '').trim();

  if (!trackerId || isNaN(trackerId)) return { ok: false, error: 'trackerId inválido' };
  if (!sheetUrl || !validateGoogleSheetUrl(sheetUrl)) {
    return { ok: false, error: 'URL de Google Sheets inválida' };
  }

  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) return { ok: false, error: 'No se pudo extraer el ID del spreadsheet' };

  try {
    const { tabs } = await fetchSpreadsheetMetadata(spreadsheetId);
    if (!tabs.length) return { ok: false, error: 'El spreadsheet no tiene pestañas' };

    // Pick the tab from the URL gid param, or default to first tab
    const gidMatch = /[?&#]gid=(\d+)/.exec(sheetUrl);
    const gid = gidMatch?.[1];
    const tab = (gid ? tabs.find((t) => t.sheetId === gid) : undefined) ?? tabs[0];
    if (!tab) return { ok: false, error: 'Pestaña no encontrada' };

    const grid = await readSheetGrid(spreadsheetId, tab.title);
    if (!grid.length) return { ok: false, error: 'La hoja está vacía' };

    // Auto-detect the link column:
    // 1. Check header row for keywords (link, url, enlace…)
    // 2. Fallback: find the column with the most http URLs in the first rows
    const headerRow = grid[0] ?? [];
    let linkColIdx = headerRow.findIndex((h) => /url|link|enlace|vod/i.test(h));

    if (linkColIdx < 0) {
      let best = 0;
      for (let c = 0; c < headerRow.length; c++) {
        let hits = 0;
        for (let r = 0; r < Math.min(grid.length, 30); r++) {
          if (/^https?:\/\//i.test((grid[r]?.[c] ?? '').trim())) hits++;
        }
        if (hits > best) { best = hits; linkColIdx = c; }
      }
    }

    if (linkColIdx < 0) return { ok: false, error: 'No se encontró columna de links en la hoja' };

    // Skip header row if it doesn't look like a URL
    const startRow = /^https?:\/\//i.test((grid[0]?.[linkColIdx] ?? '').trim()) ? 0 : 1;

    const rows: ParsedLinkRow[] = [];
    for (let r = startRow; r < grid.length; r++) {
      const url = (grid[r]?.[linkColIdx] ?? '').trim();
      if (url && /^https?:\/\//i.test(url)) {
        rows.push({ originalUrl: url, sourceRowIndex: r });
      }
    }

    if (!rows.length) return { ok: false, error: 'No se encontraron URLs válidas en la hoja' };

    // Auto-detect targetCount from grid content if not already set.
    // Pattern: "12x preroll", "5x video", "15 streams", "3 videos" etc.
    const autoTarget = detectTargetFromGrid(grid);
    if (autoTarget !== null) {
      await updateTrackerTarget(trackerId, autoTarget);
    }

    const result = await importTrackerItems(
      trackerId,
      rows,
      `gsheet:${spreadsheetId}/${tab.title}`,
    );

    revalidatePath(`/admin/entregables/${trackerId}`);
    return { ok: true, inserted: result.inserted, duplicates: result.duplicatesSkipped };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al sincronizar con Google Sheets' };
  }
}

// ── updateTrackerTargetAction ─────────────────────────────────────────────────

export async function updateTrackerTargetAction(formData: FormData): Promise<ActionResult> {
  await requirePermission('campanas', 'write');

  const trackerId  = Number(formData.get('trackerId'));
  const targetCount = Number(formData.get('targetCount'));

  if (!trackerId || isNaN(trackerId))   return { ok: false, error: 'trackerId inválido' };
  if (isNaN(targetCount) || targetCount < 0) return { ok: false, error: 'Objetivo inválido' };

  try {
    await updateTrackerTarget(trackerId, targetCount);
    revalidatePath(`/admin/entregables/${trackerId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al actualizar' };
  }
}

// ── reviewTrackerItemAction ───────────────────────────────────────────────────

export async function reviewTrackerItemAction(formData: FormData): Promise<ActionResult> {
  const session = await requirePermission('campanas', 'write');

  const parsed = reviewTrackerItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  try {
    await reviewTrackerItem(parsed.data.itemId, parsed.data.status, session.user.id);
    // trackerId for revalidation: we get it from the form
    const trackerId = formData.get('trackerId');
    if (trackerId) revalidatePath(`/admin/entregables/${trackerId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al revisar item' };
  }
}

// ── approveTrackerAction ──────────────────────────────────────────────────────

export async function approveTrackerAction(formData: FormData): Promise<ActionResult> {
  const session = await requirePermission('campanas', 'write');

  const trackerId = Number(formData.get('trackerId'));
  if (!trackerId || isNaN(trackerId)) return { ok: false, error: 'trackerId inválido' };

  try {
    await approveTracker(trackerId, session.user.id);
    revalidatePath('/admin/entregables');
    revalidatePath(`/admin/entregables/${trackerId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al aprobar tracker' };
  }
}
