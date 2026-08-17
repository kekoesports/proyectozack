import { AutomationDealCreate, AutomationTrackingSheetUpdate } from '@/lib/schemas/automationDeal';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

const validDeal = {
  name: 'Marca Demo - Creador Demo',
  brand: { name: 'Marca Demo' },
  talent: {
    name: 'Creador Demo',
    handle: '@creador_demo',
    platform: 'twitch',
    topGeos: [
      { country: 'Spain', pct: 85 },
      { country: 'Argentina', pct: 10 },
    ],
  },
  deliverables: [
    { type: 'stream_integration', targetCount: 5 },
    { type: 'video_youtube', targetCount: 5 },
    { type: 'preroll', targetCount: 5 },
  ],
  amountBrand: 1000,
  amountTalent: 700,
};

describe('AutomationDealCreate', () => {
  it('acepta un trato multientregable y aplica defaults seguros', () => {
    const parsed = AutomationDealCreate.safeParse(validDeal);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.status).toBe('propuesta');
    expect(parsed.data.currency).toBe('EUR');
    expect(parsed.data.deliverables).toHaveLength(3);
  });

  it('rechaza importes incoherentes', () => {
    const parsed = AutomationDealCreate.safeParse({
      ...validDeal,
      amountBrand: 100,
      amountTalent: 101,
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza porcentajes GEO que superan 100', () => {
    const parsed = AutomationDealCreate.safeParse({
      ...validDeal,
      talent: {
        ...validDeal.talent,
        topGeos: [
          { country: 'Spain', pct: 80 },
          { country: 'Argentina', pct: 30 },
        ],
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('AutomationTrackingSheetUpdate', () => {
  it('acepta una URL real de Google Sheets', () => {
    expect(AutomationTrackingSheetUpdate.safeParse({
      trackingSheetUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=0',
    }).success).toBe(true);
  });

  it('rechaza URLs ajenas aunque sean válidas', () => {
    expect(AutomationTrackingSheetUpdate.safeParse({
      trackingSheetUrl: 'https://example.com/spreadsheets/d/abc123',
    }).success).toBe(false);
  });
});

describe('verifyAutomationToken', () => {
  beforeEach(() => {
    process.env.AUTOMATION_API_TOKEN = 'automation-token-at-least-32-characters';
  });

  afterEach(() => {
    delete process.env.AUTOMATION_API_TOKEN;
  });

  it('falla cerrado si no hay credencial configurada', () => {
    delete process.env.AUTOMATION_API_TOKEN;
    const result = verifyAutomationToken(new Request('http://localhost/api/automation/deals'));
    expect(result).toEqual({ ok: false, reason: 'missing-config' });
  });

  it('rechaza un bearer incorrecto', () => {
    const req = new Request('http://localhost/api/automation/deals', {
      headers: { authorization: 'Bearer credencial-incorrecta-muy-larga' },
    });
    expect(verifyAutomationToken(req)).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('acepta el bearer correcto', () => {
    const req = new Request('http://localhost/api/automation/deals', {
      headers: { authorization: 'Bearer automation-token-at-least-32-characters' },
    });
    expect(verifyAutomationToken(req)).toEqual({ ok: true });
  });
});
