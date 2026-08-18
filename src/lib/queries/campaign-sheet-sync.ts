import 'server-only';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { campaigns } from '@/db/schema/campaigns';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import {
  extractSpreadsheetId,
  listSheetTabs,
  readSheetGrid,
  SheetsApiError,
} from '@/lib/integrations/google-sheets';
import {
  detectSocialProBlocks,
} from '@/lib/parsers/socialpro-blocks';
import { applyCampaignSheetEvidence } from '@/lib/queries/campaign-sheet-evidence';
import {
  aggregateBlocksByType,
  aggregateCanonicalDealTable,
} from '@/lib/queries/campaign-sheet-aggregation';

export {
  aggregateBlocksByType,
  aggregateCanonicalDealTable,
  normalizeUrl,
} from '@/lib/queries/campaign-sheet-aggregation';

/**
 * Parseo del gid desde una URL de Google Sheets.
 * Ej: https://docs.google.com/spreadsheets/d/<id>/edit?gid=123#gid=123
 */
export function extractSheetGid(url: string): string | null {
  // Prefer '#gid=' (más habitual al copiar) sobre '?gid='
  const hashMatch = /[#&]gid=(\d+)/.exec(url);
  if (hashMatch?.[1]) return hashMatch[1];
  const qsMatch = /[?&]gid=(\d+)/.exec(url);
  return qsMatch?.[1] ?? null;
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type SyncSuccess = {
  readonly ok: true;
  readonly updated: number;
  readonly ignoredBlocks: number;
  readonly notFoundTypes: number;
  readonly syncedAt: string; // ISO 8601
  readonly summary: string;
};

export type SyncFailure = {
  readonly ok: false;
  readonly error: string;
};

export type SyncResult = SyncSuccess | SyncFailure;

// ── Server: fetch + parse + apply ─────────────────────────────────────────────

async function loadCampaignAndTrackers(campaignId: number): Promise<{
  campaign: {
    id: number;
    trackingSheetUrl: string | null;
    trackingSheetSpreadsheetId: string | null;
    trackingSheetGid: string | null;
  } | null;
  trackers: Array<{ id: number; deliverableType: string; currentCount: number }>;
}> {
  const [campaign] = await db
    .select({
      id: campaigns.id,
      trackingSheetUrl: campaigns.trackingSheetUrl,
      trackingSheetSpreadsheetId: campaigns.trackingSheetSpreadsheetId,
      trackingSheetGid: campaigns.trackingSheetGid,
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    return { campaign: null, trackers: [] };
  }

  const trackers = await db
    .select({
      id: dealDeliverableTrackers.id,
      deliverableType: dealDeliverableTrackers.deliverableType,
      currentCount: dealDeliverableTrackers.currentCount,
    })
    .from(dealDeliverableTrackers)
    .where(
      and(
        eq(dealDeliverableTrackers.campaignId, campaignId),
        ne(dealDeliverableTrackers.status, 'cancelled'),
      ),
    );

  return { campaign, trackers };
}

/**
 * Sincroniza los currentCount de los trackers activos del trato leyendo el
 * Google Sheet asociado.
 *
 * Reglas:
 *   1. NO crea trackers nuevos (bloques huérfanos → ignoredBlocks++).
 *   2. NO resetea currentCount de trackers sin bloque → notFoundTypes++.
 *   3. Agrupa por deliverableType, cuenta URLs únicas normalizadas.
 *   4. Guarda last_tracking_sync_at + limpia tracking_sync_error en éxito.
 *   5. Guarda tracking_sync_error humano-readable en fallo — nunca throws.
 */
export async function syncCampaignSheet(campaignId: number): Promise<SyncResult> {
  const { campaign, trackers } = await loadCampaignAndTrackers(campaignId);

  if (!campaign) {
    return { ok: false, error: 'Trato no encontrado.' };
  }

  const url = campaign.trackingSheetUrl?.trim() ?? '';
  const spreadsheetId =
    campaign.trackingSheetSpreadsheetId ?? (url ? extractSpreadsheetId(url) : null);

  if (!spreadsheetId) {
    const msg = 'Sin Google Sheet configurada. Pega el link de la plantilla duplicada y guarda el trato antes de sincronizar.';
    await persistError(campaignId, msg);
    return { ok: false, error: msg };
  }

  try {
    // Resolver tab: gid → title
    const tabs = await listSheetTabs(spreadsheetId);
    if (tabs.length === 0) {
      const msg = 'La hoja no tiene pestañas legibles.';
      await persistError(campaignId, msg);
      return { ok: false, error: msg };
    }
    // tabs.length >= 1 verificado arriba — narrowing manual para lint.
    const firstTab = tabs[0];
    if (!firstTab) {
      const msg = 'La hoja no tiene pestañas legibles.';
      await persistError(campaignId, msg);
      return { ok: false, error: msg };
    }
    let tabTitle: string;
    if (campaign.trackingSheetGid) {
      const found = tabs.find((t) => t.sheetId === campaign.trackingSheetGid);
      tabTitle = found?.title ?? firstTab.title;
    } else {
      tabTitle = firstTab.title;
    }

    // Leer + parsear
    const grid = await readSheetGrid(spreadsheetId, tabTitle);
    const canonical = aggregateCanonicalDealTable(grid);
    const { countsByType, evidenceByType, ignoredBlocks } = canonical.matched
      ? {
          countsByType: canonical.countsByType,
          evidenceByType: canonical.evidenceByType,
          ignoredBlocks: canonical.invalidRows,
        }
      : (() => {
          const { blocks } = detectSocialProBlocks(grid, tabTitle);
          const legacy = aggregateBlocksByType(blocks);
          // En la plantilla heredada, los bloques válidos no son "ignorados".
          // Los tipos sin tracker se contabilizan abajo mediante unmatchedTypes.
          return {
            countsByType: legacy.countsByType,
            evidenceByType: legacy.evidenceByType,
            ignoredBlocks: 0,
          };
        })();

    // Cruzar con trackers del trato
    const trackerByType = new Map<string, { id: number; currentCount: number }>();
    for (const t of trackers) {
      if (!trackerByType.has(t.deliverableType)) {
        trackerByType.set(t.deliverableType, { id: t.id, currentCount: t.currentCount });
      }
    }

    const now = new Date();
    const applied = await applyCampaignSheetEvidence({
      campaignId,
      trackers,
      evidenceByType,
      resetMissingTypes: canonical.matched,
      syncedAt: now,
    });

    const unmatchedTypes = Math.max(0, countsByType.size - applied.usedTypes.size);
    const totalIgnoredBlocks = ignoredBlocks + unmatchedTypes;
    const notFoundTypes = Array.from(trackerByType.keys())
      .filter((type) => !countsByType.has(type)).length;

    const summary = buildSummary(applied.updated, totalIgnoredBlocks, notFoundTypes);
    return {
      ok: true,
      updated: applied.updated,
      ignoredBlocks: totalIgnoredBlocks,
      notFoundTypes,
      syncedAt: now.toISOString(),
      summary,
    };
  } catch (err) {
    const msg = errorMessage(err);
    await persistError(campaignId, msg);
    return { ok: false, error: msg };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof SheetsApiError) {
    if (err.status === 403) {
      return 'La hoja no es pública o no se puede leer. Compártela como "cualquiera con el enlace".';
    }
    if (err.status === 404) {
      return 'Google Sheet no encontrado. Revisa el link o el gid.';
    }
    if (err.status === 429) {
      return 'Google Sheets ha limitado el ritmo de peticiones. Vuelve a intentarlo en unos segundos.';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Error desconocido al sincronizar.';
}

async function persistError(campaignId: number, message: string): Promise<void> {
  const now = new Date();
  await db
    .update(campaigns)
    .set({ trackingSyncError: message, updatedAt: now })
    .where(eq(campaigns.id, campaignId));
}

function buildSummary(updated: number, ignoredBlocks: number, notFoundTypes: number): string {
  const parts: string[] = [];
  parts.push(`${updated} entregable${updated === 1 ? '' : 's'} actualizado${updated === 1 ? '' : 's'}`);
  if (ignoredBlocks > 0) parts.push(`${ignoredBlocks} bloque${ignoredBlocks === 1 ? '' : 's'} ignorado${ignoredBlocks === 1 ? '' : 's'} (no coincide${ignoredBlocks === 1 ? '' : 'n'} con entregables del trato)`);
  if (notFoundTypes > 0) parts.push(`${notFoundTypes} entregable${notFoundTypes === 1 ? '' : 's'} del trato sin bloque en la Sheet`);
  return parts.join(' · ');
}

// ── Guardado de link al crear/editar trato ────────────────────────────────────

/**
 * Prepara los valores a persistir en la fila `campaigns` para el input de
 * link. Se usa desde createCampaignAction / updateCampaignAction.
 *
 * - `trackingSheetUrl`: la URL tal cual pegó el usuario (o null si vacía).
 * - `trackingSheetSpreadsheetId`: cache extraído (o null).
 * - `trackingSheetGid`: cache extraído (o null si no viene).
 *
 * Cuando el usuario cambia la URL respecto a la existente:
 *   - Se limpia `trackingSyncError` (nuevo Sheet → estado fresco).
 *   - `lastTrackingSyncAt` se preserva (para audit histórico); si prefieres
 *     resetearlo al cambiar URL, pásalo por args del caller.
 */
export function normalizeTrackingSheetInput(rawUrl: string): {
  trackingSheetUrl: string | null;
  trackingSheetSpreadsheetId: string | null;
  trackingSheetGid: string | null;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      trackingSheetUrl: null,
      trackingSheetSpreadsheetId: null,
      trackingSheetGid: null,
    };
  }
  const spreadsheetId = extractSpreadsheetId(trimmed);
  const gid = extractSheetGid(trimmed);
  return {
    trackingSheetUrl: trimmed,
    trackingSheetSpreadsheetId: spreadsheetId,
    trackingSheetGid: gid,
  };
}

// ── Info a mostrar en el drawer ───────────────────────────────────────────────

export type CampaignTrackingSheetInfo = {
  readonly url: string | null;
  readonly lastSyncedAt: string | null; // ISO
  readonly syncError: string | null;
};

export async function getCampaignTrackingSheetInfo(
  campaignId: number,
): Promise<CampaignTrackingSheetInfo | null> {
  const [row] = await db
    .select({
      url: campaigns.trackingSheetUrl,
      lastSyncedAt: campaigns.lastTrackingSyncAt,
      syncError: campaigns.trackingSyncError,
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  if (!row) return null;
  return {
    url: row.url,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    syncError: row.syncError,
  };
}
