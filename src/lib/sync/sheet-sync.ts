import { db } from '@/lib/db';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { brandSheetSources } from '@/db/schema/brandSheetSources';
import { fetchSpreadsheetMetadata, readSheetGrid } from '@/lib/integrations/google-sheets';
import { detectSocialProBlocks } from '@/lib/parsers/socialpro-blocks';
import { parseHorizontalTriplets } from '@/lib/parsers/horizontal-triplets';
import { importTrackerItems } from '@/lib/queries/deal-trackers';
import { eq } from 'drizzle-orm';
import type { ParsedLinkRow } from '@/lib/schemas/deal-tracker';

export type SyncTrackerResult =
  | { inserted: number; duplicates: number; enriched: number }
  | { error: string };

/**
 * Opcional: inyecta un fetcher de metadata para deduplicar llamadas a Google
 * dentro de una misma ejecución del cron. Si varios trackers comparten
 * `spreadsheetId`, se hace 1 sola call de metadata.
 *
 * Si no se pasa, usa el fetcher por defecto (sin dedup).
 */
type MetadataFetcher = (spreadsheetId: string) => Promise<{ title: string; tabs: { sheetId: string; title: string; index: number }[] }>;

export async function syncTrackerBlock(
  trackerId: number,
  opts: { metadataFetcher?: MetadataFetcher } = {},
): Promise<SyncTrackerResult> {
  const getMetadata = opts.metadataFetcher ?? fetchSpreadsheetMetadata;

  const [tracker] = await db
    .select()
    .from(dealDeliverableTrackers)
    .where(eq(dealDeliverableTrackers.id, trackerId))
    .limit(1);

  if (!tracker) return { error: 'Tracker no encontrado' };
  if (!tracker.googleSpreadsheetId || !tracker.googleSheetGid) {
    return { error: 'Tracker sin configuración de Google Sheet' };
  }

  const [source] = tracker.brandSheetSourceId
    ? await db
        .select()
        .from(brandSheetSources)
        .where(eq(brandSheetSources.id, tracker.brandSheetSourceId))
        .limit(1)
    : [];
  void source;

  const { tabs } = await getMetadata(tracker.googleSpreadsheetId);
  const tab = tabs.find((t) => t.sheetId === tracker.googleSheetGid);
  if (!tab) return { error: `Pestaña con GID ${tracker.googleSheetGid} no encontrada` };

  const grid = await readSheetGrid(tracker.googleSpreadsheetId, tab.title);

  let rows: ParsedLinkRow[];

  if (tracker.trackingParseMode === 'horizontal_triplets') {
    const triplets = parseHorizontalTriplets(grid);
    rows = triplets.map((t) => ({
      originalUrl: t.originalUrl,
      sourceRowIndex: t.rowIndex,
      deliverableSubtype: t.subtype ?? undefined,
    }));
  } else {
    const { blocks } = detectSocialProBlocks(grid, tab.title);

    const targetBlock = tracker.googleSheetBlockTitle
      ? blocks.find((b) => b.title === tracker.googleSheetBlockTitle)
      : blocks.find(
          (b) =>
            b.startCol === (tracker.googleSheetStartCol ?? 0) &&
            b.headerRow === (tracker.googleSheetHeaderRow ?? 0),
        );

    if (!targetBlock) {
      return {
        error: `Bloque "${tracker.googleSheetBlockTitle ?? 'desconocido'}" no encontrado en la pestaña`,
      };
    }

    rows = targetBlock.links.map((l) => ({
      originalUrl: l.originalUrl,
      sourceRowIndex: l.rowIndex,
    }));
  }

  const result = await importTrackerItems(
    trackerId,
    rows,
    `gsheet:${tracker.googleSpreadsheetId}/${tab.title}`,
  );

  await db
    .update(dealDeliverableTrackers)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(dealDeliverableTrackers.id, trackerId));

  return { inserted: result.inserted, duplicates: result.duplicatesSkipped, enriched: result.enriched };
}
