'use server';

import { requirePermission } from '@/lib/permissions';
import {
  createSheetSourceSchema,
  detectStructureSchema,
  applyDetectionSchema,
  syncTrackerBlockSchema,
} from '@/lib/schemas/brand-sheet-source';
import {
  createSheetSource,
  getSheetSourceWithTrackers,
  updateSheetSourceStatus,
  updateSheetSourceTimestamps,
} from '@/lib/queries/brand-sheet-sources';
import {
  fetchSpreadsheetMetadata,
  readSheetGrid,
  extractSpreadsheetId,
} from '@/lib/integrations/google-sheets';
import { detectSocialProBlocks } from '@/lib/parsers/socialpro-blocks';
import { syncTrackerBlock } from '@/lib/sync/sheet-sync';
import { db } from '@/lib/db';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { talents } from '@/db/schema/talents';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { DELIVERABLE_TYPES } from '@/lib/schemas/deal-tracker';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionResult = { ok: true } | { ok: false; error: string };

export type BlockPreviewItem = {
  tabName: string;
  gid: string;
  blockTitle: string;
  talentName: string;
  dealLabel: string;
  specs: Array<{ count: number; rawType: string; suggestedType: string }>;
  linkCount: number;
  startCol: number;
  headerRow: number;
  linkColIndex: number;
  existingTrackerId: number | null;
  existingCurrentCount: number | null;
  action: 'create' | 'update' | 'no_change';
  suggestedTalentId: number | null;
  suggestedTalentName: string | null;
};

export type SheetDetectionPreview = {
  sourceId: number;
  spreadsheetTitle: string;
  scannedAt: string;
  tabs: Array<{
    gid: string;
    tabName: string;
    blocks: BlockPreviewItem[];
  }>;
};

// Schema to validate the parsed selectedBlocks JSON
const blockPreviewItemSchema = z.object({
  tabName: z.string(),
  gid: z.string(),
  blockTitle: z.string(),
  talentName: z.string(),
  dealLabel: z.string(),
  specs: z.array(
    z.object({
      count: z.number().int().positive(),
      rawType: z.string(),
      suggestedType: z.string(),
    }),
  ),
  linkCount: z.number().int().min(0),
  startCol: z.number().int().min(0),
  headerRow: z.number().int().min(0),
  linkColIndex: z.number().int().min(0),
  existingTrackerId: z.number().int().positive().nullable(),
  existingCurrentCount: z.number().int().min(0).nullable(),
  action: z.enum(['create', 'update', 'no_change']),
  suggestedTalentId: z.number().int().positive().nullable(),
  suggestedTalentName: z.string().nullable(),
});

const selectedBlocksSchema = z.array(blockPreviewItemSchema);

// ── Helper: sync a single tracker block (delegated to shared module) ─────────

// syncTrackerBlock is imported from @/lib/sync/sheet-sync above.

// ── createSheetSourceAction ───────────────────────────────────────────────────

export async function createSheetSourceAction(
  formData: FormData,
): Promise<ActionResult & { id?: number }> {
  await requirePermission('campanas', 'write');

  const parsed = createSheetSourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  // Validate URL contains a spreadsheet ID
  const spreadsheetId = extractSpreadsheetId(parsed.data.googleSheetUrl);
  if (!spreadsheetId) {
    return {
      ok: false,
      error: 'No se pudo extraer el ID del spreadsheet de la URL proporcionada',
    };
  }

  try {
    const source = await createSheetSource(parsed.data);
    revalidatePath('/admin/entregables/fuentes');
    return { ok: true, id: source.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error al crear la fuente',
    };
  }
}

// ── detectSheetStructureAction ────────────────────────────────────────────────
// Read-only: does NOT mutate DB, only reads GSheets and parses.

export async function detectSheetStructureAction(
  formData: FormData,
): Promise<ActionResult & { preview?: SheetDetectionPreview }> {
  await requirePermission('campanas', 'write');

  const parsed = detectStructureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { sourceId } = parsed.data;

  try {
    const sourceData = await getSheetSourceWithTrackers(sourceId);
    if (!sourceData) return { ok: false, error: 'Fuente no encontrada' };

    const { title: spreadsheetTitle, tabs } = await fetchSpreadsheetMetadata(
      sourceData.spreadsheetId,
    );

    await updateSheetSourceTimestamps(sourceId, { lastScannedAt: new Date() });

    const previewTabs: SheetDetectionPreview['tabs'] = [];

    for (const tab of tabs) {
      const grid = await readSheetGrid(sourceData.spreadsheetId, tab.title);
      const { blocks } = detectSocialProBlocks(grid, tab.title);

      const blockPreviews: BlockPreviewItem[] = [];

      for (const block of blocks) {
        // Check if a tracker already exists for this source + gid + blockTitle.
        // sourceData.trackers is already loaded — no extra DB call needed.
        const existingTracker = sourceData.trackers.find(
          (t) =>
            t.googleSheetGid === tab.sheetId &&
            t.googleSheetBlockTitle === block.title,
        );

        // Match talent by name case-insensitively
        const [matchedTalent] = await db
          .select({ id: talents.id, name: talents.name })
          .from(talents)
          .where(sql`LOWER(${talents.name}) = LOWER(${block.talentName})`)
          .limit(1);

        const hasExisting = existingTracker !== undefined;
        const currentLinks = block.links.length;
        const existingCount = existingTracker?.currentCount ?? null;

        let action: BlockPreviewItem['action'];
        if (!hasExisting) {
          action = 'create';
        } else if (currentLinks > (existingCount ?? 0)) {
          action = 'update';
        } else {
          action = 'no_change';
        }

        blockPreviews.push({
          tabName: tab.title,
          gid: tab.sheetId,
          blockTitle: block.title,
          talentName: block.talentName,
          dealLabel: block.dealLabel,
          specs: block.specs,
          linkCount: currentLinks,
          startCol: block.startCol,
          headerRow: block.headerRow,
          linkColIndex: block.linkColIndex,
          existingTrackerId: existingTracker?.id ?? null,
          existingCurrentCount: existingCount,
          action,
          suggestedTalentId: matchedTalent?.id ?? null,
          suggestedTalentName: matchedTalent?.name ?? null,
        });
      }

      if (blockPreviews.length > 0) {
        previewTabs.push({ gid: tab.sheetId, tabName: tab.title, blocks: blockPreviews });
      }
    }

    const preview: SheetDetectionPreview = {
      sourceId,
      spreadsheetTitle,
      scannedAt: new Date().toISOString(),
      tabs: previewTabs,
    };

    return { ok: true, preview };
  } catch (err) {
    await updateSheetSourceStatus(
      sourceId,
      'error',
      err instanceof Error ? err.message : 'Error desconocido',
    );
    return { ok: false, error: err instanceof Error ? err.message : 'Error al detectar estructura' };
  }
}

// ── applySheetDetectionAction ─────────────────────────────────────────────────

export async function applySheetDetectionAction(
  formData: FormData,
): Promise<ActionResult & { created?: number; updated?: number }> {
  await requirePermission('campanas', 'write');

  const parsed = applyDetectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { sourceId } = parsed.data;

  // Validate and parse the selected blocks JSON
  let rawBlocks: unknown;
  try {
    rawBlocks = JSON.parse(parsed.data.selectedBlocks) as unknown;
  } catch {
    return { ok: false, error: 'JSON de bloques seleccionados inválido' };
  }

  const blocksResult = selectedBlocksSchema.safeParse(rawBlocks);
  if (!blocksResult.success) {
    return {
      ok: false,
      error: 'Formato de bloques inválido: ' + blocksResult.error.issues.map((i) => i.message).join(', '),
    };
  }

  const selectedBlocks = blocksResult.data;
  const sourceData = await getSheetSourceWithTrackers(sourceId);
  if (!sourceData) return { ok: false, error: 'Fuente no encontrada' };

  let created = 0;
  let updated = 0;

  for (const block of selectedBlocks) {
    try {
      if (block.existingTrackerId !== null) {
        // Existing tracker → sync
        const syncResult = await syncTrackerBlock(block.existingTrackerId);
        if ('error' in syncResult) continue; // non-fatal
        if (syncResult.inserted > 0) updated++;
      } else {
        // New tracker
        const dealName = `${block.tabName} — ${block.blockTitle}`.slice(0, 300);
        const suggested = block.specs[0]?.suggestedType ?? 'otro';
        const deliverableType = (DELIVERABLE_TYPES as readonly string[]).includes(suggested)
          ? (suggested as (typeof DELIVERABLE_TYPES)[number]) // safe: validated against DELIVERABLE_TYPES tuple above
          : 'otro';
        const targetCount = block.specs.reduce((sum, s) => sum + s.count, 0);

        const [newTracker] = await db
          .insert(dealDeliverableTrackers)
          .values({
            brandName:             sourceData.brandName,
            dealName,
            deliverableType,
            targetCount,
            talentId:              block.suggestedTalentId ?? null,
            brandSheetSourceId:    sourceId,
            googleSheetGid:        block.gid,
            googleSheetBlockTitle: block.blockTitle,
            googleSheetBlockIndex: 0,
            googleSheetStartCol:   block.startCol,
            googleSheetHeaderRow:  block.headerRow,
            googleSheetLinkCol:    block.linkColIndex,
            trackingParseMode:     'socialpro_blocks',
            trackingSourceType:    'google_sheet',
            googleSpreadsheetId:   sourceData.spreadsheetId,
            trackingSourceUrl:     sourceData.googleSheetUrl,
          })
          .returning();

        if (newTracker) {
          // Sync links immediately
          await syncTrackerBlock(newTracker.id);
          created++;
        }
      }
    } catch {
      // Non-fatal: continue with remaining blocks
    }
  }

  revalidatePath('/admin/entregables/fuentes');
  revalidatePath(`/admin/entregables/fuentes/${sourceId}`);
  revalidatePath('/admin/entregables');
  return { ok: true, created, updated };
}

// ── syncTrackerBlockAction ────────────────────────────────────────────────────

export async function syncTrackerBlockAction(
  formData: FormData,
): Promise<ActionResult & { inserted?: number; duplicates?: number }> {
  await requirePermission('campanas', 'write');

  const parsed = syncTrackerBlockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  try {
    const result = await syncTrackerBlock(parsed.data.trackerId);
    if ('error' in result) return { ok: false, error: result.error };

    revalidatePath(`/admin/entregables/${parsed.data.trackerId}`);
    revalidatePath('/admin/entregables');
    return { ok: true, inserted: result.inserted, duplicates: result.duplicates };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al sincronizar' };
  }
}

// ── syncSourceAction ──────────────────────────────────────────────────────────

export async function syncSourceAction(
  formData: FormData,
): Promise<ActionResult & { synced?: number; newBlocks?: number }> {
  await requirePermission('campanas', 'write');

  const parsed = detectStructureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { sourceId } = parsed.data;

  try {
    const sourceData = await getSheetSourceWithTrackers(sourceId);
    if (!sourceData) return { ok: false, error: 'Fuente no encontrada' };

    let synced = 0;
    let newBlocks = 0;

    // Sync all trackers linked to this source
    for (const tracker of sourceData.trackers) {
      const result = await syncTrackerBlock(tracker.id);
      if ('error' in result) continue;
      synced++;
      if (result.inserted > 0) newBlocks++;
    }

    await updateSheetSourceTimestamps(sourceId, { lastSyncedAt: new Date() });
    revalidatePath(`/admin/entregables/fuentes/${sourceId}`);
    revalidatePath('/admin/entregables');
    return { ok: true, synced, newBlocks };
  } catch (err) {
    await updateSheetSourceStatus(
      sourceId,
      'error',
      err instanceof Error ? err.message : 'Error desconocido',
    );
    return { ok: false, error: err instanceof Error ? err.message : 'Error al sincronizar fuente' };
  }
}
