'server-only';

import { getCampaignMarginSummary } from '@/lib/services/ai-assistant/tools/campaigns';
import type { CampaignMarginRow } from '@/types/financeDashboard';

const LOW_MARGIN_THRESHOLD = 20;

export async function getCampaignMargins(): Promise<readonly CampaignMarginRow[]> {
  const rows = await getCampaignMarginSummary();
  return rows.map((r): CampaignMarginRow => ({
    id: r.id,
    name: r.name,
    brandName: r.brandName,
    talentName: r.talentName,
    status: r.status,
    amountBrand: r.amountBrand,
    amountTalent: r.amountTalent,
    computedMarginPct: r.computedMarginPct,
    isLow: r.computedMarginPct !== null && r.computedMarginPct < LOW_MARGIN_THRESHOLD,
    cobroConfirmado: r.cobroConfirmado,
    pagoTalentConfirmado: r.pagoTalentConfirmado,
  }));
}

export { LOW_MARGIN_THRESHOLD };
