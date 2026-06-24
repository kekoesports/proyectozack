'use server';

import { requirePermission } from '@/lib/permissions';
import { createTrackerSchema, reviewTrackerItemSchema, importLinksSchema } from '@/lib/schemas/deal-tracker';
import {
  createTracker,
  importTrackerItems,
  reviewTrackerItem,
  approveTracker,
} from '@/lib/queries/deal-trackers';
import { extractXlsxSheet } from '@/lib/parsers/xlsx';
import { extractCsvSheet } from '@/lib/parsers/csv';
import { parseAnyDate } from '@/lib/parsers/common';
import { revalidatePath } from 'next/cache';
import type { ParsedLinkRow } from '@/lib/schemas/deal-tracker';

type ActionResult = { ok: true } | { ok: false; error: string };

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
