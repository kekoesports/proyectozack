import { computeKpis } from '@/features/admin/campaigns/components/CampaignsList.parts';
import type { CampaignWithRelations } from '@/types';

function makeCampaign(overrides: Partial<CampaignWithRelations> = {}): CampaignWithRelations {
  const base: CampaignWithRelations = {
    id: 1,
    name: 'Test',
    brandId: 1,
    talentId: 1,
    brandContactId: null,
    responsibleUserId: null,
    createdByUserId: null,
    assignedToUserId: null,
    sector: null,
    geo: null,
    actionType: 'stream',
    status: 'activa',
    startDate: null,
    endDate: null,
    deliveryDeadline: null,
    briefingUrl: null,
    contentUrl: null,
    notes: null,
    currency: 'EUR',
    amountBrand: '10000',
    amountTalent: '7000',
    amountInKindTalent: null,
    amountInKindCommunity: null,
    estimatedCostAgency: null,
    estimatedMarginPct: null,
    cnmcChecklistOk: false,
    cnmcChecklistAt: null,
    cnmcChecklistUserId: null,
    brandPaymentMethod: null,
    talentPaymentMethod: null,
    cobroConfirmado: false,
    pagoTalentConfirmado: false,
    trackingSheetUrl: null,
    trackingSheetSpreadsheetId: null,
    trackingSheetGid: null,
    lastTrackingSyncAt: null,
    trackingSyncError: null,
    visibility: 'team',
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    brandName: 'Marca Test',
    talentName: 'Talent Test',
    ownerName: null,
    brandPaid: 'no',
    talentPaid: 'no',
    totalInvoicedBrand: 0,
    totalPaidTalent: 0,
    commissionAmount: 3000,
    commissionPct: 30,
    ...overrides,
  };
  return base;
}

describe('computeKpis — tratos cancelados', () => {
  it('un trato cancelado no suma al total', () => {
    const campaigns = [makeCampaign({ status: 'cancelada' })];
    const kpis = computeKpis(campaigns);
    expect(kpis.total).toBe(0);
  });

  it('un trato cancelado no suma a revenue', () => {
    const campaigns = [makeCampaign({ status: 'cancelada', amountBrand: '75000' })];
    const kpis = computeKpis(campaigns);
    expect(kpis.revenueBruto).toBe(0);
  });

  it('un trato cancelado no suma al margen', () => {
    const campaigns = [makeCampaign({ status: 'cancelada', amountBrand: '75000', amountTalent: '60000' })];
    const kpis = computeKpis(campaigns);
    expect(kpis.margenTotal).toBe(0);
  });

  it('un trato cancelado no suma a pendiente de cobro', () => {
    const campaigns = [makeCampaign({ status: 'cancelada' })];
    const kpis = computeKpis(campaigns);
    expect(kpis.pendienteCobro).toBe(0);
  });

  it('un trato cancelado no suma a pendiente de talent', () => {
    const campaigns = [makeCampaign({ status: 'cancelada' })];
    const kpis = computeKpis(campaigns);
    expect(kpis.pendienteTalent).toBe(0);
  });

  it('mezcla: activo + cancelado — solo el activo contabiliza', () => {
    const campaigns = [
      makeCampaign({ id: 1, status: 'activa',    amountBrand: '10000', amountTalent: '7000' }),
      makeCampaign({ id: 2, status: 'cancelada', amountBrand: '75000', amountTalent: '60000' }),
    ];
    const kpis = computeKpis(campaigns);
    expect(kpis.total).toBe(1);
    expect(kpis.activos).toBe(1);
    expect(kpis.revenueBruto).toBe(10000);
    expect(kpis.margenTotal).toBe(3000);
    expect(kpis.pendienteCobro).toBe(10000);
    expect(kpis.pendienteTalent).toBe(7000);
  });

  it('trato cancelado archivado tampoco contabiliza', () => {
    const campaigns = [makeCampaign({ status: 'cancelada', archivedAt: new Date() })];
    const kpis = computeKpis(campaigns);
    expect(kpis.total).toBe(0);
    expect(kpis.revenueBruto).toBe(0);
  });
});

describe('computeKpis — otros estados no afectados', () => {
  it('trato pagado sí suma a revenue y margen, no a pendientes', () => {
    const campaigns = [makeCampaign({ status: 'pagada', amountBrand: '10000', amountTalent: '7000' })];
    const kpis = computeKpis(campaigns);
    expect(kpis.revenueBruto).toBe(10000);
    expect(kpis.margenTotal).toBe(3000);
    expect(kpis.pendienteCobro).toBe(0);
    expect(kpis.pendienteTalent).toBe(0);
  });

  it('trato activo suma a todo', () => {
    const campaigns = [makeCampaign({ status: 'activa', amountBrand: '10000', amountTalent: '7000' })];
    const kpis = computeKpis(campaigns);
    expect(kpis.total).toBe(1);
    expect(kpis.activos).toBe(1);
    expect(kpis.revenueBruto).toBe(10000);
    expect(kpis.margenTotal).toBe(3000);
    expect(kpis.pendienteCobro).toBe(10000);
    expect(kpis.pendienteTalent).toBe(7000);
  });
});
