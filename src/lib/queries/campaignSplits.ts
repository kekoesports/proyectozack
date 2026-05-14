'server-only';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { campaignSplits, SPLIT_PARTIES } from '@/db/schema/campaignSplits';
import type { SplitParty } from '@/db/schema/campaignSplits';

export type { SplitParty };

export type CampaignSplit = {
  party:      SplitParty;
  percentage: number;
};

export type PartnerOwed = {
  party:       SplitParty;
  totalMargin: number;
  totalOwed:   number;
};

/** Lee los splits de una campaña. Devuelve los 4 socios con 0 si no hay registro. */
export async function getCampaignSplits(campaignId: number): Promise<CampaignSplit[]> {
  const rows = await db
    .select({ party: campaignSplits.party, percentage: campaignSplits.percentage })
    .from(campaignSplits)
    .where(eq(campaignSplits.campaignId, campaignId));

  const map = new Map(rows.map((r) => [r.party, Number(r.percentage)]));
  return SPLIT_PARTIES.map((p) => ({ party: p, percentage: map.get(p) ?? 0 }));
}

/** Lee los splits de TODAS las campañas. Devuelve un mapa campaignId → splits. */
export async function getAllCampaignSplits(): Promise<Record<number, CampaignSplit[]>> {
  const rows = await db
    .select({
      campaignId: campaignSplits.campaignId,
      party:      campaignSplits.party,
      percentage: campaignSplits.percentage,
    })
    .from(campaignSplits);

  const map: Record<number, CampaignSplit[]> = {};
  for (const row of rows) {
    const id  = row.campaignId;
    const pct = Number(row.percentage);
    if (!map[id]) map[id] = SPLIT_PARTIES.map((p) => ({ party: p, percentage: 0 }));
    const entry = map[id].find((s) => s.party === row.party);
    if (entry) entry.percentage = pct;
  }
  return map;
}

/** Upsert los splits de una campaña. Espera un array con los 4 socios. */
export async function upsertCampaignSplits(
  campaignId: number,
  splits: CampaignSplit[],
): Promise<void> {
  if (splits.length === 0) return;
  await db
    .insert(campaignSplits)
    .values(splits.map((s) => ({ campaignId, party: s.party, percentage: String(s.percentage) })))
    .onConflictDoUpdate({
      target: [campaignSplits.campaignId, campaignSplits.party],
      set: { percentage: sql`excluded.percentage`, updatedAt: new Date() },
    });
}

/**
 * Calcula lo que se debe a cada socio sumando el margen de todas las campañas
 * filtradas por rango de fechas (opcional).
 * Base = amountBrand - amountTalent de campañas no canceladas con splits definidos.
 */
export async function getPartnersOwed(opts?: {
  from?: string;
  to?: string;
}): Promise<PartnerOwed[]> {
  const rows = await db.execute(sql`
    SELECT
      cs.party,
      SUM((c.amount_brand::numeric - c.amount_talent::numeric)) AS total_margin,
      SUM((c.amount_brand::numeric - c.amount_talent::numeric) * cs.percentage::numeric / 100) AS total_owed
    FROM campaign_splits cs
    JOIN campaigns c ON c.id = cs.campaign_id
    WHERE c.status != 'cancelada'
      ${opts?.from ? sql`AND c.created_at::date >= ${opts.from}::date` : sql``}
      ${opts?.to   ? sql`AND c.created_at::date <= ${opts.to}::date`   : sql``}
    GROUP BY cs.party
    ORDER BY cs.party
  `);

  return (rows.rows as { party: string; total_margin: string; total_owed: string }[]).map((r) => ({
    party:       r.party as SplitParty,
    totalMargin: Number(r.total_margin),
    totalOwed:   Number(r.total_owed),
    pct:         0,
  }));
}
