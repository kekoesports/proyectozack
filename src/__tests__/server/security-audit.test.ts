/**
 * Tests para los hallazgos del audit de seguridad (rama fix/security-audit-findings).
 *
 * Finding 1 — endpoint /api/_debug/db eliminado (CRITICAL)
 * Finding 2 — RBAC por herramienta en AI assistant (HIGH)
 * Finding 3 — proxy PDF de contratos via firmante token (HIGH)
 * Finding 5 — entropía de token de compartición stats: randomBytes(32) (LOW)
 */

// ── mocks globales ─────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: jest.fn(),
  requireRole: jest.fn(),
  requirePermission: jest.fn(),
}));

// AI assistant — tool modules con dependencias de BD
const mockLogToolExecution = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/queries/aiAssistant', () => ({
  logToolExecution: (...args: unknown[]) => mockLogToolExecution(...args),
  createThread: jest.fn(),
  getThread: jest.fn(),
  insertMessage: jest.fn(),
  touchThread: jest.fn(),
  updateThreadTitle: jest.fn(),
  getThreadMessages: jest.fn(),
  listThreadsForUser: jest.fn(),
  deleteThread: jest.fn(),
}));

jest.mock('@/lib/services/ai-assistant/tools/billing', () => ({
  getBillingSummary: jest.fn().mockResolvedValue({ total: 0 }),
  getOverdueInvoices: jest.fn().mockResolvedValue([]),
  getPendingInvoices: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/services/ai-assistant/tools/campaigns', () => ({
  getCampaignMarginSummary: jest.fn().mockResolvedValue([]),
  getActiveCampaigns: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/services/ai-assistant/tools/expenses', () => ({
  getMonthlyExpenseSummary: jest.fn().mockResolvedValue({}),
  getRecurringExpensesSummary: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/services/ai-assistant/tools/help', () => ({
  getHelpContextText: jest.fn().mockReturnValue('help text'),
}));
jest.mock('@/lib/services/ai-assistant/tools/bankReconciliation', () => ({
  getBankReconciliationSummary: jest.fn().mockResolvedValue({}),
  getUnmatchedBankTransactions: jest.fn().mockResolvedValue([]),
  getSuggestedTransactionMatches: jest.fn().mockResolvedValue([]),
  getPendingPaymentMatches: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/services/ai-assistant/tools/financeDashboard', () => ({
  getFinanceDashboardSummary: jest.fn().mockResolvedValue({}),
  getCashflowTrend: jest.fn().mockResolvedValue([]),
  getReceivablesRiskSummary: jest.fn().mockResolvedValue({}),
  getCampaignMarginAlerts: jest.fn().mockResolvedValue([]),
  getFinanceAlerts: jest.fn().mockResolvedValue([]),
}));

// PDF proxy — contracts query
const mockGetSignerByToken = jest.fn();
jest.mock('@/lib/queries/contracts', () => ({
  getSignerByToken: (...args: unknown[]) => mockGetSignerByToken(...args),
  recordSignature: jest.fn(),
  getContractById: jest.fn(),
  updateContract: jest.fn(),
  listContracts: jest.fn(),
  createContract: jest.fn(),
  deleteContract: jest.fn(),
}));

// ── imports tras mocks ─────────────────────────────────────────────────

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { NextRequest } from 'next/server';
import { runTool } from '@/lib/services/ai-assistant/tools/index';
import { GET as pdfProxyGET } from '@/app/api/contracts/[token]/pdf/route';

// ── Finding 1: endpoint debug eliminado ───────────────────────────────

describe('Finding 1 — endpoint /api/_debug/db eliminado', () => {
  it('el archivo route.ts de _debug/db no existe en disco', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/_debug/db/route.ts');
    expect(fs.existsSync(routePath)).toBe(false);
  });

  it('el directorio _debug tampoco existe', () => {
    const dirPath = path.join(process.cwd(), 'src/app/api/_debug');
    expect(fs.existsSync(dirPath)).toBe(false);
  });
});

// ── Finding 2: RBAC por herramienta en AI assistant ───────────────────

describe('Finding 2 — RBAC por herramienta en AI assistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogToolExecution.mockResolvedValue(undefined);
  });

  const FINANCE_AND_BANK_TOOLS = [
    'getBillingSummary',
    'getOverdueInvoices',
    'getPendingInvoices',
    'getRecurringExpensesSummary',
    'getMonthlyExpenseSummary',
    'getFinanceDashboardSummary',
    'getReceivablesRiskSummary',
    'getFinanceAlerts',
    'getBankReconciliationSummary',
    'getUnmatchedBankTransactions',
    'getSuggestedTransactionMatches',
    'getPendingPaymentMatches',
  ] as const;

  it('editor bloqueado de todas las herramientas financieras y bancarias', async () => {
    for (const tool of FINANCE_AND_BANK_TOOLS) {
      const result = await runTool({ name: tool, threadId: 1, userRole: 'editor' });
      expect(result.ok).toBe(false); // editor bloqueado de ${tool}
      if (!result.ok) expect(result.error).toMatch(/denegado/i);
    }
  });

  it('talent_manager bloqueado de herramientas financieras y bancarias', async () => {
    for (const tool of FINANCE_AND_BANK_TOOLS) {
      const result = await runTool({ name: tool, threadId: 1, userRole: 'talent_manager' });
      expect(result.ok).toBe(false); // talent_manager bloqueado de ${tool}
    }
  });

  it('analyst bloqueado de herramientas de facturación y bancos', async () => {
    const analyticsDenied = [
      'getBillingSummary', 'getOverdueInvoices', 'getPendingInvoices',
      'getRecurringExpensesSummary', 'getMonthlyExpenseSummary',
      'getFinanceDashboardSummary', 'getReceivablesRiskSummary', 'getFinanceAlerts',
      'getBankReconciliationSummary', 'getUnmatchedBankTransactions',
      'getSuggestedTransactionMatches', 'getPendingPaymentMatches',
    ] as const;
    for (const tool of analyticsDenied) {
      const result = await runTool({ name: tool, threadId: 1, userRole: 'analyst' });
      expect(result.ok).toBe(false); // analyst bloqueado de ${tool}
    }
  });

  it('admin puede usar todas las herramientas financieras', async () => {
    for (const tool of FINANCE_AND_BANK_TOOLS) {
      const result = await runTool({ name: tool, threadId: 1, userRole: 'admin' });
      expect(result.ok).toBe(true); // admin puede usar ${tool}
    }
  });

  it('manager puede usar todas las herramientas financieras', async () => {
    for (const tool of FINANCE_AND_BANK_TOOLS) {
      const result = await runTool({ name: tool, threadId: 1, userRole: 'manager' });
      expect(result.ok).toBe(true); // manager puede usar ${tool}
    }
  });

  it('finance puede usar todas las herramientas financieras', async () => {
    for (const tool of FINANCE_AND_BANK_TOOLS) {
      const result = await runTool({ name: tool, threadId: 1, userRole: 'finance' });
      expect(result.ok).toBe(true); // finance puede usar ${tool}
    }
  });

  it('ops puede ver campañas pero no finanzas', async () => {
    const allowed = await runTool({ name: 'getActiveCampaigns', threadId: 1, userRole: 'ops' });
    expect(allowed.ok).toBe(true);

    const blocked = await runTool({ name: 'getBillingSummary', threadId: 1, userRole: 'ops' });
    expect(blocked.ok).toBe(false);
  });

  it('talent_manager puede ver campañas y analytics pero no finanzas', async () => {
    const campaign = await runTool({ name: 'getActiveCampaigns', threadId: 1, userRole: 'talent_manager' });
    expect(campaign.ok).toBe(true);

    const analytics = await runTool({ name: 'getCashflowTrend', threadId: 1, userRole: 'talent_manager' });
    expect(analytics.ok).toBe(true);

    const billing = await runTool({ name: 'getBillingSummary', threadId: 1, userRole: 'talent_manager' });
    expect(billing.ok).toBe(false);
  });

  it('analyst puede ver analytics pero no campañas ni finanzas', async () => {
    const trend = await runTool({ name: 'getCashflowTrend', threadId: 1, userRole: 'analyst' });
    expect(trend.ok).toBe(true);

    const campaigns = await runTool({ name: 'getActiveCampaigns', threadId: 1, userRole: 'analyst' });
    expect(campaigns.ok).toBe(false);
  });

  it('getCrmHelpContext accesible para todos los roles autenticados', async () => {
    const roles = ['admin', 'manager', 'finance', 'editor', 'talent_manager', 'analyst', 'ops'] as const;
    for (const role of roles) {
      const result = await runTool({ name: 'getCrmHelpContext', threadId: 1, userRole: role });
      expect(result.ok).toBe(true); // getCrmHelpContext accesible para ${role}
    }
  });

  it('acceso denegado registra logToolExecution con status=blocked', async () => {
    await runTool({ name: 'getBillingSummary', threadId: 42, userRole: 'editor' });
    expect(mockLogToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 42,
        toolName: 'getBillingSummary',
        status: 'blocked',
        errorMessage: 'insufficient-role',
      }),
    );
  });
});

// ── Finding 3: proxy PDF de contratos ─────────────────────────────────

describe('Finding 3 — proxy PDF de contratos', () => {
  const TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';

  const makeReq = () =>
    new NextRequest(`http://localhost:3000/api/contracts/${TOKEN}/pdf`);

  const makeParams = (token = TOKEN) =>
    ({ params: Promise.resolve({ token }) });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token-123';
  });

  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('token desconocido → 404', async () => {
    mockGetSignerByToken.mockResolvedValue(null);
    const res = await pdfProxyGET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it('firmante válido sin fileUrl → 404', async () => {
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contract: { fileUrl: null, fileName: 'contrato.pdf' },
    });
    const res = await pdfProxyGET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it('sin BLOB_READ_WRITE_TOKEN → 503', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contract: { fileUrl: 'https://blob.example.com/test.pdf', fileName: 'contrato.pdf' },
    });
    const res = await pdfProxyGET(makeReq(), makeParams());
    expect(res.status).toBe(503);
  });

  it('firmante válido con PDF → 200 con cabeceras correctas', async () => {
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contract: { fileUrl: 'https://blob.example.com/test.pdf', fileName: 'contrato.pdf' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: (k: string) => (k === 'content-type' ? 'application/pdf' : null) },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    const res = await pdfProxyGET(makeReq(), makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toMatch(/^inline/);
    expect(res.headers.get('Content-Disposition')).toContain('contrato.pdf');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('el BLOB_READ_WRITE_TOKEN no aparece en ninguna cabecera de respuesta', async () => {
    const SECRET = 'super-secret-blob-token-xyz';
    process.env.BLOB_READ_WRITE_TOKEN = SECRET;
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contract: { fileUrl: 'https://blob.example.com/test.pdf', fileName: 'test.pdf' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    const res = await pdfProxyGET(makeReq(), makeParams());
    for (const [, value] of res.headers.entries()) {
      expect(value).not.toContain(SECRET);
    }
  });

  it('blob fetch falla → 404', async () => {
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contract: { fileUrl: 'https://blob.example.com/test.pdf', fileName: 'test.pdf' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    const res = await pdfProxyGET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it('fileName con path traversal queda saneado en Content-Disposition', async () => {
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contract: {
        fileUrl: 'https://blob.example.com/test.pdf',
        fileName: '../../../etc/passwd',
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    const res = await pdfProxyGET(makeReq(), makeParams());
    const cd = res.headers.get('Content-Disposition') ?? '';
    expect(cd).not.toContain('..');
    expect(cd).not.toContain('/');
  });

  it('el proxy llama a fetch con Authorization Bearer (no expone URL blob directa al cliente)', async () => {
    const BLOB_URL = 'https://blob.example.com/private/test.pdf';
    mockGetSignerByToken.mockResolvedValue({
      id: 1,
      contract: { fileUrl: BLOB_URL, fileName: 'test.pdf' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    await pdfProxyGET(makeReq(), makeParams());

    expect(global.fetch).toHaveBeenCalledWith(
      BLOB_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }),
      }),
    );
  });
});

// ── Finding 5: entropía de token de compartición stats ────────────────

describe('Finding 5 — token de stats usa randomBytes(32)', () => {
  it('el código fuente de stats-actions.ts contiene randomBytes(32)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/admin/(dashboard)/stats/stats-actions.ts'),
      'utf-8',
    );
    expect(src).toContain('randomBytes(32)');
    // Asegurar que no queda el patrón antiguo de 16 bytes
    expect(src).not.toMatch(/randomBytes\(1[0-9]\)/);
  });

  it('randomBytes(32).toString("base64url") produce al menos 40 caracteres', () => {
    // 32 bytes en base64url = 43 chars (sin padding); el mínimo real es 43
    const token = crypto.randomBytes(32).toString('base64url');
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('randomBytes(32) produce más entropía que randomBytes(16)', () => {
    const token32 = crypto.randomBytes(32).toString('base64url');
    const token16 = crypto.randomBytes(16).toString('base64url');
    // 32-byte token es siempre más largo que 16-byte token
    expect(token32.length).toBeGreaterThan(token16.length);
  });
});
