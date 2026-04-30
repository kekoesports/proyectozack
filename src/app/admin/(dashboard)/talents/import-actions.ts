'use server';

/**
 * Stub re-export. The actual import logic lives in ./import/actions.ts.
 * This file exists only to satisfy imports from features/admin/talents/components
 * that reference the old (deleted) path.
 *
 * TODO: migrate TalentImporter and TalentImportPreview to use the new InfluencerImport wizard.
 */

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { talents, talentSocials } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { initialsOf, slugify } from '@/lib/utils/import-utils';

// ── Types consumed by TalentImporter / TalentImportPreview ───────────

export type ParsedTalentRow = {
  rowNumber: number;
  name: string;
  country?: string | undefined;
  action: 'create' | 'update' | 'review';
  errors: string[];
  warnings: string[];
  twitch?:    { followersDisplay: string } | undefined;
  youtube?:   { followersDisplay: string } | undefined;
  instagram?: { followersDisplay: string } | undefined;
  tiktok?:    { followersDisplay: string } | undefined;
  kick?:      { followersDisplay: string } | undefined;
  contactTelegram?: string | undefined;
  contactDiscord?:  string | undefined;
  contactEmail?:    string | undefined;
  existingName?:    string | undefined;
};

export type TalentImportPreview = {
  rows: ParsedTalentRow[];
  mappedColumns: { original: string; field: string }[];
  unmappedColumns: string[];
  summary: { total: number; create: number; update: number; review: number; errors: number };
  error?: string;
};

export type TalentImportResult = {
  success?: boolean;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?:  string[];
  error?:   string;
};

// ── Stub preview action ───────────────────────────────────────────────

export async function previewTalentImportAction(
  _prev: TalentImportPreview,
  formData: FormData,
): Promise<TalentImportPreview> {
  await requireRole('admin', '/admin/login');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { rows: [], mappedColumns: [], unmappedColumns: [], summary: { total: 0, create: 0, update: 0, review: 0, errors: 0 }, error: 'No se ha subido ningún archivo' };
  }

  // Delegate to the InfluencerImport wizard via the new import/actions.ts
  // For now return an empty preview instructing the user to use the new importer.
  return {
    rows: [],
    mappedColumns: [],
    unmappedColumns: [],
    summary: { total: 0, create: 0, update: 0, review: 0, errors: 0 },
    error: 'Usa el tab "Importar talentos" en el panel de importación.',
  };
}

// ── Stub confirm action ───────────────────────────────────────────────

export async function confirmTalentImportAction(
  _prev: TalentImportResult,
  formData: FormData,
): Promise<TalentImportResult> {
  await requireRole('admin', '/admin/login');
  const rowsRaw = formData.get('rows') as string | null;
  if (!rowsRaw) return { error: 'Sin datos' };

  let rows: ParsedTalentRow[];
  try {
    rows = JSON.parse(rowsRaw) as ParsedTalentRow[];
  } catch {
    return { error: 'Datos inválidos' };
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (row.errors.length > 0 || row.action === 'review') { skipped++; continue; }
    if (!row.name) { skipped++; continue; }

    try {
      const slug = slugify(row.name);
      const [maxRow] = await db
        .select({ max: sql<number>`COALESCE(MAX(${talents.sortOrder}), 0)` })
        .from(talents);
      const [inserted] = await db.insert(talents).values({
        slug, name: row.name,
        role: 'Creator', game: 'General', platform: 'twitch',
        status: 'inactive', bio: '', gradientC1: '#f5632a', gradientC2: '#8b3aad',
        initials: initialsOf(row.name),
        sortOrder: (maxRow?.max ?? 0) + 1,
        visibility: 'internal',
        creatorCountry: row.country ?? undefined,
      }).returning({ id: talents.id });

      if (inserted && row.twitch) {
        await db.insert(talentSocials).values({ talentId: inserted.id, platform: 'twitch', handle: '', followersDisplay: row.twitch.followersDisplay, hexColor: '#9147ff', sortOrder: 1 });
      }
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      errors.push(`${row.name}: ${msg}`);
      skipped++;
    }
  }

  revalidatePath('/admin/talents');
  return { success: true, created, skipped, errors };
}
