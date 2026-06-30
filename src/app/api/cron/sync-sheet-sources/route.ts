import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { db } from '@/lib/db';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { brandSheetSources } from '@/db/schema/brandSheetSources';
import { isNotNull, eq } from 'drizzle-orm';
import { syncTrackerBlock } from '@/lib/sync/sheet-sync';
import { updateSheetSourceTimestamps } from '@/lib/queries/brand-sheet-sources';
import { createLimit } from '@/lib/utils/concurrencyLimit';
import { fetchSpreadsheetMetadata, SheetsApiError } from '@/lib/integrations/google-sheets';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Cron diario que sincroniza los trackers vinculados a Google Sheets.
 *
 * Mitigación de 429 (incidente 2026-06-25 → 2026-06-29):
 *   1. **Limitador de concurrencia** (`SHEETS_SYNC_CONCURRENCY`, default 4) —
 *      evita disparar N×2 requests simultáneos. Antes: `Promise.allSettled` sin
 *      control, podía mandar 100+ requests de golpe contra la cuota de
 *      Google Sheets v4 (100 reads / 100s / proyecto).
 *   2. **Backoff exponencial + jitter + Retry-After** dentro de `withRetry`
 *      en `google-sheets.ts` — 3 intentos como máximo en cada llamada.
 *   3. **Dedup in-memory de metadata** durante la ejecución — si M trackers
 *      comparten el mismo `spreadsheetId`, solo se hace 1 metadata call.
 *
 * Logs (sin PII):
 *   - Por tracker: `{ trackerId, ok|failed|rate_limited, durationMs }`
 *   - Final: `{ total, ok, failed, rate_limited, inserted }`
 *
 * Respuesta JSON pública: `{ success, total, ok, failed, rate_limited, inserted }`.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  try {
    const trackers = await db
      .select({ id: dealDeliverableTrackers.id })
      .from(dealDeliverableTrackers)
      .where(isNotNull(dealDeliverableTrackers.brandSheetSourceId));

    const concurrency = env.SHEETS_SYNC_CONCURRENCY;
    const limit = createLimit(concurrency);

    // Dedup in-memory: misma metadata Promise compartida entre trackers que
    // referencian el mismo spreadsheetId durante esta ejecución.
    // Se reinicia al terminar el handler — sin estado persistente.
    const metadataCache = new Map<string, Promise<{ title: string; tabs: { sheetId: string; title: string; index: number }[] }>>();
    const dedupedFetchMetadata = (spreadsheetId: string) => {
      const cached = metadataCache.get(spreadsheetId);
      if (cached) return cached;
      const fresh = fetchSpreadsheetMetadata(spreadsheetId);
      metadataCache.set(spreadsheetId, fresh);
      return fresh;
    };

    type Outcome = 'ok' | 'failed' | 'rate_limited';
    type TrackerResult = { trackerId: number; outcome: Outcome; durationMs: number; inserted: number };

    const settled = await Promise.allSettled(
      trackers.map((t) =>
        limit<TrackerResult>(async () => {
          const startMs = Date.now();
          try {
            const res = await syncTrackerBlock(t.id, { metadataFetcher: dedupedFetchMetadata });
            const durationMs = Date.now() - startMs;
            if ('error' in res) {
              console.warn('[sync-sheet-sources] tracker failed', { trackerId: t.id, durationMs });
              return { trackerId: t.id, outcome: 'failed', durationMs, inserted: 0 };
            }
            console.log('[sync-sheet-sources] tracker ok', { trackerId: t.id, inserted: res.inserted, durationMs });
            return { trackerId: t.id, outcome: 'ok', durationMs, inserted: res.inserted };
          } catch (err) {
            const durationMs = Date.now() - startMs;
            if (err instanceof SheetsApiError && err.status === 429) {
              console.warn('[sync-sheet-sources] tracker rate_limited', { trackerId: t.id, durationMs });
              return { trackerId: t.id, outcome: 'rate_limited', durationMs, inserted: 0 };
            }
            const status = err instanceof SheetsApiError ? err.status : 0;
            console.error('[sync-sheet-sources] tracker error', { trackerId: t.id, status, durationMs });
            return { trackerId: t.id, outcome: 'failed', durationMs, inserted: 0 };
          }
        }),
      ),
    );

    let ok = 0;
    let failed = 0;
    let rateLimited = 0;
    let inserted = 0;
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const r = s.value;
        if (r.outcome === 'ok') { ok++; inserted += r.inserted; }
        else if (r.outcome === 'rate_limited') { rateLimited++; }
        else { failed++; }
      } else {
        // Una excepción no capturada por el wrapper (no debería ocurrir, pero defensivo).
        failed++;
        console.error('[sync-sheet-sources] unexpected reject', s.reason);
      }
    }

    // Actualizar `lastSyncedAt` solo para las sources activas (mismo comportamiento previo).
    // Esto es un set de UPDATEs a DB, no toca Google.
    const activeSources = await db
      .select({ id: brandSheetSources.id })
      .from(brandSheetSources)
      .where(eq(brandSheetSources.status, 'active'));

    await Promise.allSettled(
      activeSources.map((s) =>
        updateSheetSourceTimestamps(s.id, { lastSyncedAt: new Date() }),
      ),
    );

    const total = trackers.length;
    console.log('[sync-sheet-sources] done', {
      total,
      ok,
      failed,
      rate_limited: rateLimited,
      inserted,
      concurrency,
      metadata_dedup_hit_ratio: total > 0 ? Math.round(((total - metadataCache.size) / total) * 100) / 100 : 0,
    });

    return NextResponse.json({
      success: true,
      total,
      ok,
      failed,
      rate_limited: rateLimited,
      inserted,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sync-sheet-sources] fatal:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
