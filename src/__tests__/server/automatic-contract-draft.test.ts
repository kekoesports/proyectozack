jest.mock('server-only', () => ({}));

import { readFileSync } from 'node:fs';

const mockEnv: {
  AUTOMATION_CONTRACT_DRAFTS_ENABLED: boolean;
  AUTOMATION_CONTRACT_TEMPLATE_ID?: number;
} = {
  AUTOMATION_CONTRACT_DRAFTS_ENABLED: true,
};
jest.mock('@/lib/env', () => ({ env: mockEnv }));

const mockGetContractByCampaign = jest.fn();
const mockCreateContract = jest.fn();
jest.mock('@/lib/queries/contracts', () => ({
  getContractByCampaign: (...args: unknown[]) => mockGetContractByCampaign(...args),
  createContract: (...args: unknown[]) => mockCreateContract(...args),
}));

const mockGetCampaign = jest.fn();
jest.mock('@/lib/queries/campaigns', () => ({
  getCampaignWithRelations: (...args: unknown[]) => mockGetCampaign(...args),
}));

const mockListTemplates = jest.fn();
jest.mock('@/lib/queries/contractTemplates', () => ({
  listContractTemplates: (...args: unknown[]) => mockListTemplates(...args),
}));

const mockGeneratePdf = jest.fn();
jest.mock('@/lib/pdf/generateContractPdf', () => ({
  generateContractPdf: (...args: unknown[]) => mockGeneratePdf(...args),
}));

const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();
jest.mock('@/lib/storage', () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

const mockSelect = jest.fn();
jest.mock('@/lib/db', () => ({ db: { select: (...args: unknown[]) => mockSelect(...args) } }));

jest.mock('@/db/schema/dealDeliverableTrackers', () => ({
  dealDeliverableTrackers: {
    deliverableType: 'deliverableType',
    targetCount: 'targetCount',
    notes: 'notes',
    campaignId: 'campaignId',
  },
}));

import {
  ensureCampaignContractDraft,
  selectAutomatedContractTemplate,
} from '@/lib/queries/ensureCampaignContractDraft';
import type { ContractTemplate } from '@/lib/queries/contractTemplates';

function template(
  id: number,
  type: string,
  name = `Plantilla ${id}`,
  content = 'Contrato {{campaign_name}}\n{{deliverables}}',
): ContractTemplate {
  return {
    id,
    name,
    type,
    content,
    description: null,
    language: 'es',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function mockCampaign(sector: string | null = null) {
  return {
    id: 10,
    name: 'Marca X - Creador Y',
    sector,
    geo: 'ES',
    startDate: '2026-09-01',
    endDate: '2026-12-01',
    notes: null,
    currency: 'EUR',
    amountBrand: '12000',
    amountTalent: '9000',
    brand: { id: 2, name: 'Marca X', sector, geo: 'ES' },
    talent: { id: 3, name: 'Creador Y' },
  };
}

function dbReturnsTrackers(rows: readonly Record<string, unknown>[]): void {
  const where = jest.fn().mockResolvedValue(rows);
  const from = jest.fn(() => ({ where }));
  mockSelect.mockReturnValue({ from });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.AUTOMATION_CONTRACT_DRAFTS_ENABLED = true;
  delete mockEnv.AUTOMATION_CONTRACT_TEMPLATE_ID;
  mockGetContractByCampaign.mockResolvedValue(null);
  mockGetCampaign.mockResolvedValue(mockCampaign());
  mockListTemplates.mockResolvedValue([template(1, 'service_agreement')]);
  dbReturnsTrackers([
    { type: 'preroll', targetCount: 30, notes: 'Prerolls en YouTube' },
  ]);
  mockGeneratePdf.mockResolvedValue(Buffer.from('%PDF-test'));
  mockUploadFile.mockResolvedValue({
    storageKey: 'contracts/uuid.pdf',
    publicUrl: null,
    size: 9,
    contentType: 'application/pdf',
    checksum: 'abc',
    visibility: 'private',
  });
  mockCreateContract.mockResolvedValue({ id: 77 });
  mockDeleteFile.mockResolvedValue(undefined);
});

describe('selectAutomatedContractTemplate', () => {
  it('respeta el override explícito', () => {
    const chosen = selectAutomatedContractTemplate(
      [template(1, 'service_agreement'), template(9, 'casino')],
      { overrideId: 9, sector: 'trading' },
    );
    expect(chosen?.id).toBe(9);
  });

  it('elige la única plantilla del sector casino', () => {
    const chosen = selectAutomatedContractTemplate(
      [template(1, 'service_agreement'), template(12, 'casino')],
      { sector: 'gambling' },
    );
    expect(chosen?.id).toBe(12);
  });

  it('no escoge al azar entre dos plantillas sectoriales', () => {
    const chosen = selectAutomatedContractTemplate(
      [template(1, 'service_agreement'), template(9, 'cs2_cases'), template(10, 'cs2_cases')],
      { sector: 'CS2 skins' },
    );
    expect(chosen?.id).toBe(1);
  });
});

describe('ensureCampaignContractDraft', () => {
  it('queda inerte detrás del kill switch', async () => {
    mockEnv.AUTOMATION_CONTRACT_DRAFTS_ENABLED = false;

    await expect(ensureCampaignContractDraft(10)).resolves.toEqual({
      status: 'skipped',
      reason: 'automatic-contract-drafts-disabled',
    });
    expect(mockGetContractByCampaign).not.toHaveBeenCalled();
  });

  it('no crea un segundo contrato', async () => {
    mockGetContractByCampaign.mockResolvedValue({ id: 55 });

    await expect(ensureCampaignContractDraft(10)).resolves.toEqual({
      status: 'already_had_contract',
      contractId: 55,
    });
    expect(mockGeneratePdf).not.toHaveBeenCalled();
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('genera y guarda solo un borrador portable', async () => {
    const result = await ensureCampaignContractDraft(10);

    expect(result).toEqual({ status: 'created', contractId: 77, templateId: 1 });
    expect(mockGeneratePdf).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('30 × Prerolls en YouTube'),
    }));
    expect(mockUploadFile).toHaveBeenCalledWith(expect.objectContaining({
      visibility: 'private',
      prefix: 'contracts',
      contentType: 'application/pdf',
    }));
    expect(mockCreateContract).toHaveBeenCalledWith(expect.objectContaining({
      campaignId: 10,
      fileUrl: 'contracts/uuid.pdf',
      filePath: 'contracts/uuid.pdf',
      status: 'draft',
      sentAt: null,
      signedAt: null,
      createdByUserId: null,
    }));
  });

  it('limpia el fichero si falla el insert del contrato', async () => {
    mockCreateContract.mockRejectedValue(new Error('db-failed'));

    await expect(ensureCampaignContractDraft(10)).resolves.toEqual({
      status: 'failed',
      reason: 'db-failed',
    });
    expect(mockDeleteFile).toHaveBeenCalledWith('contracts/uuid.pdf');
  });
});

describe('automatic contract draft approval boundary', () => {
  it('solo se conecta al flujo revisado, no al alta directa de deals', () => {
    const reviewedFlow = readFileSync(
      'src/lib/queries/automationDealDrafts.ts',
      'utf8',
    );
    const directFlow = readFileSync(
      'src/app/api/automation/deals/route.ts',
      'utf8',
    );

    expect(reviewedFlow).toContain('ensureCampaignContractDraft');
    expect(directFlow).not.toContain('ensureCampaignContractDraft');
  });
});
