'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth-guard';
import { upsertTalentFromImport } from '@/lib/queries/talents';
import { parseCsv, slugify } from '@/lib/utils/import-utils';
import { db } from '@/lib/db';
import { talentBusiness } from '@/db/schema';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { TALENT_IMPORT_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';

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

// ── Match types ─────────────────────────────────────────────────────

export type ExistingTalentData = {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly platform: string;
  readonly status: string;
  readonly creatorCountry: string | null;
  readonly audienceLanguage: string | null;
  readonly socials: readonly {
    readonly platform: string;
    readonly handle: string;
    readonly followersDisplay: string;
  }[];
  readonly business: {
    readonly contactEmail: string | null;
    readonly telegram: string | null;
    readonly internalNotes: string | null;
  } | null;
};

export type FieldDiff = {
  readonly field: string;
  readonly label: string;
  readonly docValue: string;
  readonly dbValue: string;
};

export type MatchedRow = {
  readonly rowIndex: number;
  readonly matchType: 'slug' | 'name' | 'handle';
  readonly mapped: Record<string, string>;
  readonly existing: ExistingTalentData;
  readonly diffs: readonly FieldDiff[];
  readonly selected: boolean;
};

export type UnmatchedDocRow = {
  readonly rowIndex: number;
  readonly mapped: Record<string, string>;
  readonly invalidReason?: string;
};

export type MatchDocumentResult = {
  readonly success: boolean;
  readonly matched: readonly MatchedRow[];
  readonly newRows: readonly UnmatchedDocRow[];
  readonly invalidRows: readonly UnmatchedDocRow[];
  readonly dbOnly: readonly ExistingTalentData[];
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
  const firstRow = jsonRows[0];
  if (!firstRow) return { headers: [], rows: [] };

  const headers = Object.keys(firstRow);
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
  if (!(file instanceof File)) {
    return { success: false, error: 'No se ha subido ningún archivo' };
  }

  const validation = await validateUploadedFile(file, {
    maxBytes: 5 * 1024 * 1024,
    allowedMimes: TALENT_IMPORT_TYPES.mimes,
    allowedExts: TALENT_IMPORT_TYPES.exts,
  });
  if (!validation.ok) {
    if (validation.reason === 'too_large') {
      return { success: false, error: 'Archivo demasiado grande (máx 5MB)' };
    }
    if (validation.reason === 'empty_file') {
      return { success: false, error: 'No se ha subido ningún archivo' };
    }
    return { success: false, error: 'Formato no permitido (CSV/XLSX)' };
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
      const text = await file.text();
      const parsed = parseCsv(text);
      headers = parsed.headers;
      rows = parsed.rows;
    }
  } catch (err) {
    logRedacted('error', '[admin] parseImportFile error:', err);
    return { success: false, error: 'Error al parsear el archivo' };
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

  for (const [i, raw] of rows.entries()) {
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
      logRedacted('error', '[admin] applyImport row error:', err);
      errors.push(`Fila ${i + 2} ("${name}"): import_failed`);
      skipped++;
    }
  }

  if (!dryRun) {
    revalidatePath('/admin/talents');
  }

  return { success: true, created, updated, skipped, errors };
}

// ── matchDocumentAction ───────────────────────────────────────────────

const HANDLE_FIELDS: readonly { field: string; platform: string }[] = [
  { field: 'twitchHandle', platform: 'twitch' },
  { field: 'youtubeHandle', platform: 'youtube' },
  { field: 'instagramHandle', platform: 'instagram' },
  { field: 'tiktokHandle', platform: 'tiktok' },
  { field: 'kickHandle', platform: 'kick' },
];

const DIFF_LABELS: Record<string, string> = {
  name: 'Nombre',
  platform: 'Plataforma',
  country: 'País',
  language: 'Idioma',
  followers: 'Followers',
  email: 'Email',
  telegram: 'Telegram',
  twitchHandle: 'Handle Twitch',
  youtubeHandle: 'Handle YouTube',
  instagramHandle: 'Handle Instagram',
  tiktokHandle: 'Handle TikTok',
  kickHandle: 'Handle Kick',
  notes: 'Notas',
};

function getExistingValue(
  existing: ExistingTalentData,
  field: string,
): string {
  switch (field) {
    case 'name': return existing.name;
    case 'platform': return existing.platform;
    case 'country': return existing.creatorCountry ?? '';
    case 'language': return existing.audienceLanguage ?? '';
    case 'email': return existing.business?.contactEmail ?? '';
    case 'telegram': return existing.business?.telegram ?? '';
    case 'notes': return existing.business?.internalNotes ?? '';
    case 'followers': {
      const primary = existing.socials[0];
      return primary?.followersDisplay ?? '';
    }
    default: {
      // Handle fields: twitchHandle, youtubeHandle, etc.
      for (const h of HANDLE_FIELDS) {
        if (field === h.field) {
          const social = existing.socials.find((s) => s.platform === h.platform);
          return social?.handle ?? '';
        }
      }
      return '';
    }
  }
}

function computeDiffs(
  mapped: Record<string, string>,
  existing: ExistingTalentData,
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const [field, docValue] of Object.entries(mapped)) {
    if (field === 'slug') continue; // slug is the match key, not a diffable field
    const trimmed = docValue.trim();
    if (!trimmed) continue; // skip empty doc values

    const dbValue = getExistingValue(existing, field);
    const normalizedDoc = trimmed.toLowerCase();
    const normalizedDb = dbValue.toLowerCase().trim();
    if (normalizedDoc !== normalizedDb) {
      diffs.push({
        field,
        label: DIFF_LABELS[field] ?? field,
        docValue: trimmed,
        dbValue,
      });
    }
  }
  return diffs;
}

export async function matchDocumentAction(
  input: { rows: readonly Record<string, string>[]; mapping: Record<string, string> },
): Promise<MatchDocumentResult> {
  await requireRole('admin', '/admin/login');

  const { rows, mapping } = input;
  if (!rows || rows.length === 0) {
    return { success: false, matched: [], newRows: [], invalidRows: [], dbOnly: [], error: 'No hay filas' };
  }

  // ── 1. Fetch all existing talents with socials + business ──────────
  const allTalents = await db.query.talents.findMany({
    with: {
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  // Fetch business data separately (not a relation on talents)
  const allBusiness = await db.select().from(talentBusiness);
  const businessMap = new Map(allBusiness.map((b) => [b.talentId, b]));

  // Build lookup indexes
  const bySlug = new Map<string, typeof allTalents[number]>();
  const byName = new Map<string, typeof allTalents[number]>();
  const byHandle = new Map<string, typeof allTalents[number]>();

  for (const t of allTalents) {
    bySlug.set(t.slug.toLowerCase(), t);
    byName.set(t.name.toLowerCase(), t);
    for (const s of t.socials) {
      byHandle.set(`${s.platform}:${s.handle.toLowerCase()}`, t);
    }
  }

  // ── 2. Process each document row ───────────────────────────────────
  const matched: MatchedRow[] = [];
  const newRows: UnmatchedDocRow[] = [];
  const invalidRows: UnmatchedDocRow[] = [];
  const matchedTalentIds = new Set<number>();

  for (const [i, raw] of rows.entries()) {
    const mapped: Record<string, string> = {};
    for (const [csvHeader, talentField] of Object.entries(mapping)) {
      if (talentField && talentField !== '(ignorar)') {
        mapped[talentField] = raw[csvHeader] ?? '';
      }
    }

    const name = (mapped['name'] ?? '').trim();
    if (!name) {
      invalidRows.push({ rowIndex: i, mapped, invalidReason: 'Nombre vacío' });
      continue;
    }

    // Try matching: slug → name → handle
    const docSlug = (mapped['slug'] ?? '').trim();
    const slugToTry = docSlug || slugify(name);

    let match: typeof allTalents[number] | undefined;
    let matchType: 'slug' | 'name' | 'handle' = 'slug';

    // 1. By slug
    match = bySlug.get(slugToTry.toLowerCase());
    if (!match && docSlug) {
      match = bySlug.get(slugify(docSlug).toLowerCase());
    }

    // 2. By name
    if (!match) {
      match = byName.get(name.toLowerCase());
      if (match) matchType = 'name';
    }

    // 3. By handle on any platform
    if (!match) {
      for (const hf of HANDLE_FIELDS) {
        const handle = (mapped[hf.field] ?? '').trim();
        if (handle) {
          match = byHandle.get(`${hf.platform}:${handle.toLowerCase()}`);
          if (match) {
            matchType = 'handle';
            break;
          }
        }
      }
    }

    if (match) {
      const biz = businessMap.get(match.id);
      const existing: ExistingTalentData = {
        id: match.id,
        name: match.name,
        slug: match.slug,
        platform: match.platform,
        status: match.status,
        creatorCountry: match.creatorCountry,
        audienceLanguage: match.audienceLanguage,
        socials: match.socials.map((s) => ({
          platform: s.platform,
          handle: s.handle,
          followersDisplay: s.followersDisplay,
        })),
        business: biz ? {
          contactEmail: biz.contactEmail,
          telegram: biz.telegram,
          internalNotes: biz.internalNotes,
        } : null,
      };

      const diffs = computeDiffs(mapped, existing);

      matched.push({
        rowIndex: i,
        matchType,
        mapped,
        existing,
        diffs,
        selected: diffs.length > 0,
      });
      matchedTalentIds.add(match.id);
    } else {
      newRows.push({ rowIndex: i, mapped });
    }
  }

  // ── 3. Find DB-only talents (not in document) ─────────────────────
  const dbOnly: ExistingTalentData[] = [];
  for (const t of allTalents) {
    if (matchedTalentIds.has(t.id)) continue;
    const biz = businessMap.get(t.id);
    dbOnly.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      platform: t.platform,
      status: t.status,
      creatorCountry: t.creatorCountry,
      audienceLanguage: t.audienceLanguage,
      socials: t.socials.map((s) => ({
        platform: s.platform,
        handle: s.handle,
        followersDisplay: s.followersDisplay,
      })),
      business: biz ? {
        contactEmail: biz.contactEmail,
        telegram: biz.telegram,
        internalNotes: biz.internalNotes,
      } : null,
    });
  }

  return {
    success: true,
    matched,
    newRows,
    invalidRows,
    dbOnly,
  };
}
