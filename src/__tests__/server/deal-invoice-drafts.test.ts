jest.mock('server-only', () => ({}));

const mockGetDigest = jest.fn();
const mockGetCampaign = jest.fn();
const mockGetByAutomationKey = jest.fn();
const mockListByDeal = jest.fn();
const mockGetIssuers = jest.fn();
const mockGetClient = jest.fn();
const mockCreateClient = jest.fn();
const mockAllocateNumber = jest.fn();
const mockCreateInvoice = jest.fn();

jest.mock('@/lib/queries/automationDealDigest', () => ({
  getAutomationDealDigest: mockGetDigest,
}));
jest.mock('@/lib/queries/campaigns', () => ({
  getCampaignWithRelations: mockGetCampaign,
}));
jest.mock('@/lib/queries/issuedInvoices', () => ({
  getIssuedInvoiceByAutomationKey: mockGetByAutomationKey,
  listIssuedInvoicesByDeal: mockListByDeal,
  getIssuerCompanies: mockGetIssuers,
  getBillingClientByBrand: mockGetClient,
  createBillingClient: mockCreateClient,
  allocateInvoiceNumber: mockAllocateNumber,
  createIssuedInvoice: mockCreateInvoice,
}));

import {
  ensureDealInvoiceDraft,
  formatInvoiceDraftBatchForDiscord,
} from '@/lib/services/dealInvoiceDrafts';

const campaign = {
  id: 7,
  name: 'Creador × Marca',
  brandId: 3,
  talentId: 4,
  amountBrand: '1250.00',
  currency: 'EUR',
  notes: null,
  brand: { id: 3, name: 'Marca' },
  talent: { id: 4, name: 'Creador' },
};
const issuer = {
  id: 1,
  defaultCurrency: 'EUR',
  defaultPaymentTerms: null,
};
const client = {
  id: 2,
  legalName: null,
  taxId: null,
  vatNumber: null,
  country: null,
  address: null,
  defaultVatRate: '0',
  defaultWithholdingRate: '0',
};

describe('borradores automáticos de factura por trato', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCampaign.mockResolvedValue(campaign);
    mockGetByAutomationKey.mockResolvedValue(null);
    mockListByDeal.mockResolvedValue([]);
    mockGetIssuers.mockResolvedValue([issuer]);
    mockGetClient.mockResolvedValue(client);
    mockAllocateNumber.mockResolvedValue('ES-2026-0042');
    mockCreateInvoice.mockResolvedValue({ id: 42 });
  });

  it('crea un único borrador, nunca una factura emitida', async () => {
    const result = await ensureDealInvoiceDraft(7);

    expect(result).toMatchObject({ status: 'created', invoiceId: 42, invoiceNumber: 'ES-2026-0042' });
    expect(mockCreateInvoice).toHaveBeenCalledWith(expect.objectContaining({
      invoice: expect.objectContaining({
        status: 'borrador',
        relatedDealId: 7,
        automationKey: 'deal-progress-80:7',
      }),
    }));
  });

  it('reutiliza la factura existente y no crea un duplicado', async () => {
    mockGetByAutomationKey.mockResolvedValue({
      id: 9,
      invoiceNumber: 'ES-2026-0009',
      status: 'borrador',
    });

    const result = await ensureDealInvoiceDraft(7);

    expect(result).toMatchObject({ status: 'existing', invoiceId: 9 });
    expect(mockCreateInvoice).not.toHaveBeenCalled();
    expect(mockAllocateNumber).not.toHaveBeenCalled();
  });

  it('no crea un borrador vacío si falta el importe de marca', async () => {
    mockGetCampaign.mockResolvedValue({ ...campaign, amountBrand: '0' });

    await expect(ensureDealInvoiceDraft(7)).resolves.toMatchObject({
      status: 'skipped',
      reason: 'invalid-amount',
    });
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('explica en Discord que el documento sigue sin emitirse ni enviarse', () => {
    const messages = formatInvoiceDraftBatchForDiscord({
      candidates: 1,
      created: 1,
      existing: 0,
      skipped: 0,
      failed: 0,
      outcomes: [{
        campaignId: 7,
        campaignName: campaign.name,
        talentName: 'Creador',
        brandName: 'Marca',
        status: 'created',
        invoiceId: 42,
        invoiceNumber: 'ES-2026-0042',
      }],
    });

    expect(messages.join('\n')).toContain('BORRADOR DE FACTURA CREADO');
    expect(messages.join('\n')).toContain('No se ha emitido ni enviado');
  });
});
