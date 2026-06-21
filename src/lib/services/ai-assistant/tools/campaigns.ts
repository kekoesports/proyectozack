'server-only';

import { desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { campaigns, crmBrands, talents } from '@/db/schema';

export type CampaignMarginSummary = {
  readonly id: number;
  readonly name: string;
  readonly brandName: string | null;
  readonly talentName: string | null;
  readonly status: string;
  readonly amountBrand: number;
  readonly amountTalent: number;
  readonly estimatedMarginPct: number | null;
  readonly computedMarginPct: number | null;
  readonly cobroConfirmado: boolean;
  readonly pagoTalentConfirmado: boolean;
};

export async function getCampaignMarginSummary(): Promise<readonly CampaignMarginSummary[]> {
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      brandName: crmBrands.name,
      talentName: talents.name,
      status: campaigns.status,
      amountBrand: campaigns.amountBrand,
      amountTalent: campaigns.amountTalent,
      estimatedMarginPct: campaigns.estimatedMarginPct,
      cobroConfirmado: campaigns.cobroConfirmado,
      pagoTalentConfirmado: campaigns.pagoTalentConfirmado,
    })
    .from(campaigns)
    .leftJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .leftJoin(talents, eq(campaigns.talentId, talents.id))
    .where(ne(campaigns.status, 'cancelada'))
    .orderBy(desc(campaigns.updatedAt))
    .limit(30);

  return rows.map((r) => {
    const brand = parseFloat(r.amountBrand ?? '0');
    const talent = parseFloat(r.amountTalent ?? '0');
    const computedMargin = brand > 0 ? ((brand - talent) / brand) * 100 : null;
    return {
      id: r.id,
      name: r.name,
      brandName: r.brandName ?? null,
      talentName: r.talentName ?? null,
      status: r.status,
      amountBrand: brand,
      amountTalent: talent,
      estimatedMarginPct: r.estimatedMarginPct ? parseFloat(r.estimatedMarginPct) : null,
      computedMarginPct: computedMargin !== null ? Math.round(computedMargin * 100) / 100 : null,
      cobroConfirmado: r.cobroConfirmado,
      pagoTalentConfirmado: r.pagoTalentConfirmado,
    };
  });
}

export type ActiveCampaignSummary = {
  readonly id: number;
  readonly name: string;
  readonly brandName: string | null;
  readonly talentName: string | null;
  readonly status: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly amountBrand: number;
  readonly cobroConfirmado: boolean;
};

export async function getActiveCampaigns(): Promise<readonly ActiveCampaignSummary[]> {
  const rows = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      brandName: crmBrands.name,
      talentName: talents.name,
      status: campaigns.status,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      amountBrand: campaigns.amountBrand,
      cobroConfirmado: campaigns.cobroConfirmado,
    })
    .from(campaigns)
    .leftJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .leftJoin(talents, eq(campaigns.talentId, talents.id))
    .where(
      sql`${campaigns.status} IN ('activa', 'aprobada', 'negociacion', 'pendiente_pago')`,
    )
    .orderBy(desc(campaigns.updatedAt))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brandName: r.brandName ?? null,
    talentName: r.talentName ?? null,
    status: r.status,
    startDate: r.startDate,
    endDate: r.endDate,
    amountBrand: parseFloat(r.amountBrand ?? '0'),
    cobroConfirmado: r.cobroConfirmado,
  }));
}
