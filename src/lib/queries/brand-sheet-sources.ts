import { eq, count, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brandSheetSources } from '@/db/schema/brandSheetSources';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { crmBrands } from '@/db/schema/crmBrands';
import type { CreateSheetSourceInput } from '@/lib/schemas/brand-sheet-source';

// ── Inferred types ────────────────────────────────────────────────────────────

export type SheetSource = typeof brandSheetSources.$inferSelect;

export type SheetSourceSummary = SheetSource & {
  trackerCount: number;
  crmBrandName: string | null;
};

export type SheetSourceWithTrackers = SheetSource & {
  crmBrandName: string | null;
  trackers: (typeof dealDeliverableTrackers.$inferSelect)[];
};

// ── Create ────────────────────────────────────────────────────────────────────

export async function createSheetSource(
  input: CreateSheetSourceInput,
): Promise<SheetSource> {
  const rows = await db
    .insert(brandSheetSources)
    .values({
      brandName:      input.brandName,
      crmBrandId:     input.crmBrandId ?? null,
      sourceTitle:    input.sourceTitle ?? null,
      googleSheetUrl: input.googleSheetUrl,
      spreadsheetId:  extractSpreadsheetIdFromUrl(input.googleSheetUrl),
      parseMode:      input.parseMode,
      syncEnabled:    input.syncEnabled,
    })
    .returning();

  const source = rows[0];
  if (!source) throw new Error('No se pudo crear la fuente de sheet');
  return source;
}

/** Extracts the spreadsheetId from a Google Sheets URL inline (no circular import). */
function extractSpreadsheetIdFromUrl(url: string): string {
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  return match?.[1] ?? '';
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listSheetSources(): Promise<SheetSourceSummary[]> {
  const rows = await db
    .select({
      source: brandSheetSources,
      trackerCount: count(dealDeliverableTrackers.id),
      crmBrandName: crmBrands.name,
    })
    .from(brandSheetSources)
    .leftJoin(
      dealDeliverableTrackers,
      eq(dealDeliverableTrackers.brandSheetSourceId, brandSheetSources.id),
    )
    .leftJoin(crmBrands, eq(brandSheetSources.crmBrandId, crmBrands.id))
    .groupBy(brandSheetSources.id, crmBrands.name)
    .orderBy(desc(brandSheetSources.createdAt));

  return rows.map((r) => ({
    ...r.source,
    trackerCount: Number(r.trackerCount),
    crmBrandName: r.crmBrandName ?? null,
  }));
}

// ── Get with trackers ─────────────────────────────────────────────────────────

export async function getSheetSourceWithTrackers(
  sourceId: number,
): Promise<SheetSourceWithTrackers | null> {
  const [row] = await db
    .select({
      source: brandSheetSources,
      crmBrandName: crmBrands.name,
    })
    .from(brandSheetSources)
    .leftJoin(crmBrands, eq(brandSheetSources.crmBrandId, crmBrands.id))
    .where(eq(brandSheetSources.id, sourceId))
    .limit(1);

  if (!row) return null;

  const trackers = await db
    .select()
    .from(dealDeliverableTrackers)
    .where(eq(dealDeliverableTrackers.brandSheetSourceId, sourceId))
    .orderBy(desc(dealDeliverableTrackers.createdAt));

  return {
    ...row.source,
    crmBrandName: row.crmBrandName ?? null,
    trackers,
  };
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateSheetSourceStatus(
  sourceId: number,
  status: 'active' | 'paused' | 'error',
  errorMessage?: string,
): Promise<void> {
  await db
    .update(brandSheetSources)
    .set({
      status,
      errorMessage: errorMessage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(brandSheetSources.id, sourceId));
}

// ── Update timestamps ─────────────────────────────────────────────────────────

export async function updateSheetSourceTimestamps(
  sourceId: number,
  timestamps: { lastScannedAt?: Date; lastSyncedAt?: Date },
): Promise<void> {
  await db
    .update(brandSheetSources)
    .set({
      ...(timestamps.lastScannedAt !== undefined && { lastScannedAt: timestamps.lastScannedAt }),
      ...(timestamps.lastSyncedAt  !== undefined && { lastSyncedAt:  timestamps.lastSyncedAt  }),
      updatedAt: new Date(),
    })
    .where(eq(brandSheetSources.id, sourceId));
}

// ── Get active sources (for crons) ────────────────────────────────────────────

export async function getActiveSheetSources(): Promise<SheetSource[]> {
  return db
    .select()
    .from(brandSheetSources)
    .where(eq(brandSheetSources.status, 'active'));
}
