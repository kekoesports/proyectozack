import {
  isAmbiguousMatch,
  isLinkableCampaignStatus,
  matchCampaignsToTracker,
  selectDisplayedCandidates,
  type CampaignMatchInput,
} from '@/lib/tracker-reconciliation-match';
import {
  classifyUnlinkedTrackerSchema,
  linkTrackerToCampaignSchema,
} from '@/lib/schemas/tracker-reconciliation';

const campaigns: readonly CampaignMatchInput[] = [
  {
    id: 1,
    name: 'Skinplace — Jolu junio',
    status: 'activa',
    talentId: 10,
    brandName: 'Skinplace',
    talentName: 'Jolu',
  },
  {
    id: 2,
    name: 'Skinplace — Otro',
    status: 'negociacion',
    talentId: 11,
    brandName: 'Skinplace',
    talentName: 'Naow',
  },
  {
    id: 3,
    name: 'Otra marca — Jolu',
    status: 'aprobada',
    talentId: 10,
    brandName: 'Otra',
    talentName: 'Jolu',
  },
  {
    id: 4,
    name: 'Cancelada',
    status: 'cancelada',
    talentId: 10,
    brandName: 'Skinplace',
    talentName: 'Jolu',
  },
];

describe('matchCampaignsToTracker', () => {
  it.each([
    {
      name: 'talent + brand ranks high first and is not ambiguous',
      tracker: { talentId: 10, brandName: 'Skinplace' },
      wantIds: [1, 3, 2],
      wantConfidence: 'high' as const,
      ambiguous: false,
    },
    {
      name: 'brand only with two operational hits is ambiguous',
      tracker: { talentId: null, brandName: 'Skinplace' },
      wantIds: [1, 2],
      wantConfidence: 'low' as const,
      ambiguous: true,
    },
    {
      name: 'talent only (wrong brand) is medium and skips cancelada',
      tracker: { talentId: 10, brandName: 'Noexiste' },
      wantIds: [1, 3],
      wantConfidence: 'medium' as const,
      ambiguous: true,
    },
    {
      name: 'no overlap → empty',
      tracker: { talentId: 99, brandName: 'Nada' },
      wantIds: [],
      wantConfidence: undefined,
      ambiguous: false,
    },
  ])('$name', ({ tracker, wantIds, wantConfidence, ambiguous }) => {
    const result = matchCampaignsToTracker(tracker, campaigns);
    expect(result.map((c) => c.campaignId)).toEqual(wantIds);
    const first = result[0];
    if (wantConfidence && first) expect(first.confidence).toBe(wantConfidence);
    expect(isAmbiguousMatch(result)).toBe(ambiguous);
  });

  it('hides brand-only lows when a high match exists', () => {
    const all = matchCampaignsToTracker(
      { talentId: 10, brandName: 'Skinplace' },
      campaigns,
    );
    expect(all.map((c) => c.campaignId)).toEqual([1, 3, 2]);
    expect(selectDisplayedCandidates(all).map((c) => c.campaignId)).toEqual([1, 3]);
  });

  it('caps brand-only lows at 3', () => {
    const manyLow: CampaignMatchInput[] = [1, 2, 3, 4, 5].map((id) => ({
      id,
      name: `Skinplace ${id}`,
      status: 'activa',
      talentId: 99,
      brandName: 'Skinplace',
      talentName: 'X',
    }));
    const shown = selectDisplayedCandidates(
      matchCampaignsToTracker({ talentId: null, brandName: 'Skinplace' }, manyLow),
    );
    expect(shown).toHaveLength(3);
    expect(shown.every((c) => c.confidence === 'low')).toBe(true);
  });

  it('does not preselect a campaign id', () => {
    const result = matchCampaignsToTracker(
      { talentId: 10, brandName: 'Skinplace' },
      campaigns,
    );
    const first = result[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect('selected' in first).toBe(false);
  });
});

describe('isLinkableCampaignStatus', () => {
  it.each([
    ['negociacion', true],
    ['aprobada', true],
    ['activa', true],
    ['pendiente_pago', true],
    ['propuesta', true],
    ['cancelada', false],
    ['completada', false],
    ['pagada', false],
  ] as const)('%s → %s', (status, expected) => {
    expect(isLinkableCampaignStatus(status)).toBe(expected);
  });
});

describe('reconciliation schemas', () => {
  it('rejects link without campaignId', () => {
    const parsed = linkTrackerToCampaignSchema.safeParse({ trackerId: '1' });
    expect(parsed.success).toBe(false);
  });

  it('accepts link with ids', () => {
    const parsed = linkTrackerToCampaignSchema.safeParse({
      trackerId: '12',
      campaignId: '4',
      note: 'manual',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.trackerId).toBe(12);
      expect(parsed.data.campaignId).toBe(4);
    }
  });

  it.each(['legacy', 'deferred'] as const)('classifies %s', (status) => {
    const parsed = classifyUnlinkedTrackerSchema.safeParse({
      trackerId: 3,
      status,
    });
    expect(parsed.success).toBe(true);
  });
});
