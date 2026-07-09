import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import type { DeliverableType } from '@/lib/schemas/deliverable';

/**
 * Sincroniza los entregables de un trato (`campaigns.id`) contra la tabla
 * `dealDeliverableTrackers`. NO borra filas físicamente — hace soft-delete
 * poniendo `status = 'cancelled'` cuando el usuario retira una fila del editor.
 *
 * Reglas:
 *   1. Fila con `id`:
 *      - Si el id existe y pertenece al campaign → UPDATE targetCount + notes.
 *      - Si no pertenece o no existe → se ignora (defensa contra manipulación).
 *   2. Fila sin `id` → INSERT nuevo tracker en `dealDeliverableTrackers` con
 *      `trackingSourceType='manual'`, `status='active'`, `currentCount=0`.
 *   3. Trackers que existían y ya no están en el input → UPDATE status='cancelled'.
 *      El tracking histórico se conserva (currentCount, items, etc.).
 *
 * No borra invocations si el tracker está enlazado a items (los items no se
 * tocan). Los currentCount se preservan cuando se hace UPDATE de targetCount.
 */
export type DeliverableSyncInput = {
  readonly id?: number | undefined;
  readonly deliverableType: DeliverableType;
  readonly targetCount: number;
  readonly notes?: string | null | undefined;
};

export type DeliverableSyncResult = {
  readonly inserted: number;
  readonly updated: number;
  readonly cancelled: number;
};

export async function syncCampaignDeliverables(
  campaignId: number,
  rows: readonly DeliverableSyncInput[],
): Promise<DeliverableSyncResult> {
  // Recuperar contexto del campaign para brandName/dealName/talentId
  // (dealDeliverableTrackers exige esas columnas notNull).
  const [campaign] = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      brandId: campaigns.brandId,
      talentId: campaigns.talentId,
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  if (!campaign) throw new Error(`syncCampaignDeliverables: campaign ${campaignId} not found`);

  const [brand] = await db
    .select({ id: crmBrands.id, name: crmBrands.name })
    .from(crmBrands)
    .where(eq(crmBrands.id, campaign.brandId))
    .limit(1);
  const brandName = brand?.name ?? 'SIN MARCA';

  // Existentes actuales (no cancelled) de este campaign.
  const existing = await db
    .select({
      id: dealDeliverableTrackers.id,
      deliverableType: dealDeliverableTrackers.deliverableType,
    })
    .from(dealDeliverableTrackers)
    .where(
      and(
        eq(dealDeliverableTrackers.campaignId, campaignId),
        ne(dealDeliverableTrackers.status, 'cancelled'),
      ),
    );

  const existingIds = new Set(existing.map((e) => e.id));
  const keepIds = new Set<number>();

  let inserted = 0;
  let updated = 0;

  // 1) Procesar INSERT + UPDATE
  for (const r of rows) {
    if (r.targetCount <= 0) continue;
    if (r.id !== undefined && existingIds.has(r.id)) {
      // UPDATE — solo si pertenece al campaign
      await db
        .update(dealDeliverableTrackers)
        .set({
          targetCount: r.targetCount,
          notes: r.notes ?? null,
          deliverableType: r.deliverableType,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dealDeliverableTrackers.id, r.id),
            eq(dealDeliverableTrackers.campaignId, campaignId),
          ),
        );
      keepIds.add(r.id);
      updated++;
    } else if (r.id === undefined) {
      // INSERT
      await db.insert(dealDeliverableTrackers).values({
        campaignId,
        talentId: campaign.talentId,
        brandName,
        dealName: campaign.name,
        deliverableType: r.deliverableType,
        targetCount: r.targetCount,
        currentCount: 0,
        status: 'active',
        trackingSourceType: 'manual',
        notes: r.notes ?? null,
      });
      inserted++;
    }
    // else: id presente pero no pertenece al campaign → ignoramos (defensa)
  }

  // 2) Cancelar los que ya no aparecen
  const toCancel = [...existingIds].filter((id) => !keepIds.has(id));
  let cancelled = 0;
  if (toCancel.length > 0) {
    await db
      .update(dealDeliverableTrackers)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(inArray(dealDeliverableTrackers.id, toCancel));
    cancelled = toCancel.length;
  }

  return { inserted, updated, cancelled };
}

export type ActiveDeliverableRow = {
  readonly id: number;
  readonly deliverableType: DeliverableType;
  readonly targetCount: number;
  readonly notes: string | null;
};

/**
 * Devuelve los trackers activos de un campaign para pintarlos en el editor.
 * No incluye los `cancelled` (histórico soft-deleted).
 */
export async function getCampaignActiveDeliverables(campaignId: number): Promise<ActiveDeliverableRow[]> {
  const rows = await db
    .select({
      id: dealDeliverableTrackers.id,
      deliverableType: dealDeliverableTrackers.deliverableType,
      targetCount: dealDeliverableTrackers.targetCount,
      notes: dealDeliverableTrackers.notes,
    })
    .from(dealDeliverableTrackers)
    .where(
      and(
        eq(dealDeliverableTrackers.campaignId, campaignId),
        ne(dealDeliverableTrackers.status, 'cancelled'),
      ),
    )
    .orderBy(dealDeliverableTrackers.createdAt);
  return rows.map((r) => ({
    id: r.id,
    deliverableType: r.deliverableType as DeliverableType,
    targetCount: r.targetCount,
    notes: r.notes,
  }));
}

/**
 * Versión bulk: devuelve Map<campaignId, ActiveDeliverableRow[]> para varios
 * campaigns a la vez. Usada por el listado de Tratos que precarga todos los
 * deliverables activos y los pasa al drawer cuando se abre en modo edición.
 */
export async function listActiveDeliverablesForCampaigns(
  campaignIds: readonly number[],
): Promise<Record<number, ActiveDeliverableRow[]>> {
  if (campaignIds.length === 0) return {};
  const rows = await db
    .select({
      id: dealDeliverableTrackers.id,
      campaignId: dealDeliverableTrackers.campaignId,
      deliverableType: dealDeliverableTrackers.deliverableType,
      targetCount: dealDeliverableTrackers.targetCount,
      notes: dealDeliverableTrackers.notes,
    })
    .from(dealDeliverableTrackers)
    .where(
      and(
        inArray(dealDeliverableTrackers.campaignId, campaignIds as number[]),
        ne(dealDeliverableTrackers.status, 'cancelled'),
      ),
    )
    .orderBy(dealDeliverableTrackers.createdAt);
  const acc: Record<number, ActiveDeliverableRow[]> = {};
  for (const r of rows) {
    if (r.campaignId === null) continue;
    const list = acc[r.campaignId] ?? [];
    list.push({
      id: r.id,
      deliverableType: r.deliverableType as DeliverableType,
      targetCount: r.targetCount,
      notes: r.notes,
    });
    acc[r.campaignId] = list;
  }
  return acc;
}

