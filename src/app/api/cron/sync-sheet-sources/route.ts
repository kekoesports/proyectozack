import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { db } from '@/lib/db';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { brandSheetSources } from '@/db/schema/brandSheetSources';
import { isNotNull, eq } from 'drizzle-orm';
import { syncTrackerBlock } from '@/lib/sync/sheet-sync';
import { updateSheetSourceTimestamps } from '@/lib/queries/brand-sheet-sources';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  try {
    const trackers = await db
      .select({ id: dealDeliverableTrackers.id })
      .from(dealDeliverableTrackers)
      .where(isNotNull(dealDeliverableTrackers.brandSheetSourceId));

    const results = await Promise.allSettled(
      trackers.map((t) => syncTrackerBlock(t.id)),
    );

    let synced = 0;
    let errors = 0;
    let inserted = 0;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if ('error' in r.value) {
          errors++;
          console.error('[sync-sheet-sources] tracker error:', r.value.error);
        } else {
          synced++;
          inserted += r.value.inserted;
        }
      } else {
        errors++;
        console.error('[sync-sheet-sources] rejected:', r.reason);
      }
    }

    // Update lastSyncedAt for all active sources
    const activeSources = await db
      .select({ id: brandSheetSources.id })
      .from(brandSheetSources)
      .where(eq(brandSheetSources.status, 'active'));

    await Promise.allSettled(
      activeSources.map((s) =>
        updateSheetSourceTimestamps(s.id, { lastSyncedAt: new Date() }),
      ),
    );

    console.log(`[sync-sheet-sources] done: synced=${synced} errors=${errors} inserted=${inserted}`);
    return NextResponse.json({ success: true, synced, errors, inserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sync-sheet-sources] fatal:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
