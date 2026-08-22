export const OPERATIONAL_CAMPAIGN_STATUSES = [
  'negociacion',
  'aprobada',
  'activa',
] as const;

export const LINKABLE_CAMPAIGN_STATUSES = [
  'propuesta',
  'negociacion',
  'aprobada',
  'activa',
  'pendiente_pago',
] as const;

const OPERATIONAL = new Set<string>(OPERATIONAL_CAMPAIGN_STATUSES);
const LINKABLE = new Set<string>(LINKABLE_CAMPAIGN_STATUSES);

export type ReconciliationConfidence = 'high' | 'medium' | 'low';

export type CampaignMatchCandidate = {
  readonly campaignId: number;
  readonly campaignName: string;
  readonly brandName: string;
  readonly talentName: string;
  readonly status: string;
  readonly confidence: ReconciliationConfidence;
  readonly reason: string;
};

export type TrackerMatchInput = {
  readonly talentId: number | null;
  readonly brandName: string;
};

export type CampaignMatchInput = {
  readonly id: number;
  readonly name: string;
  readonly status: string;
  readonly talentId: number;
  readonly brandName: string;
  readonly talentName: string;
};

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isLinkableCampaignStatus(status: string): boolean {
  return LINKABLE.has(status);
}

export function matchCampaignsToTracker(
  tracker: TrackerMatchInput,
  campaigns: readonly CampaignMatchInput[],
): CampaignMatchCandidate[] {
  const brand = norm(tracker.brandName);
  const out: CampaignMatchCandidate[] = [];

  for (const campaign of campaigns) {
    if (!OPERATIONAL.has(campaign.status)) continue;

    const talentHit = tracker.talentId != null && tracker.talentId === campaign.talentId;
    const campaignBrand = norm(campaign.brandName);
    const brandHit =
      brand.length > 0 &&
      (campaignBrand === brand || norm(campaign.name).includes(brand));

    if (!talentHit && !brandHit) continue;

    const confidence: ReconciliationConfidence = talentHit && brandHit
      ? 'high'
      : talentHit
        ? 'medium'
        : 'low';
    const reason = talentHit && brandHit
      ? 'Talento y marca coinciden'
      : talentHit
        ? 'Mismo talento'
        : 'Marca coincidente';

    out.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      brandName: campaign.brandName,
      talentName: campaign.talentName,
      status: campaign.status,
      confidence,
      reason,
    });
  }

  const rank: Record<ReconciliationConfidence, number> = { high: 0, medium: 1, low: 2 };
  return out.sort(
    (a, b) => rank[a.confidence] - rank[b.confidence] || a.campaignId - b.campaignId,
  );
}

/** More than one top-confidence candidate — UI must not preselect. */
export function isAmbiguousMatch(candidates: readonly CampaignMatchCandidate[]): boolean {
  if (candidates.length <= 1) return false;
  const best = candidates[0]?.confidence;
  if (!best) return false;
  return candidates.filter((c) => c.confidence === best).length > 1;
}

const MAX_LOW = 3;

/** Drop noisy brand-only hits when a high/medium match exists. */
export function selectDisplayedCandidates(
  candidates: readonly CampaignMatchCandidate[],
): CampaignMatchCandidate[] {
  const high = candidates.filter((c) => c.confidence === 'high');
  const medium = candidates.filter((c) => c.confidence === 'medium');
  const low = candidates.filter((c) => c.confidence === 'low');
  if (high.length > 0) return [...high, ...medium];
  if (medium.length > 0) return [...medium, ...low.slice(0, MAX_LOW)];
  return low.slice(0, MAX_LOW);
}
