import {
  AutomationDealCreate,
  AutomationDealDraftCreate,
  AutomationDealDraftReview,
  AutomationTrackingSheetUpdate,
} from '@/lib/schemas/automationDeal';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';
import {
  addCalendarMonths,
  resolveAutomationDealSchedule,
} from '@/lib/utils/automation-deal-schedule';

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
    expect(parsed.data.amountInKindTalent).toBe(0);
    expect(parsed.data.amountInKindCommunity).toBe(0);
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

  it('acepta producto y sorteos como importes separados', () => {
    const parsed = AutomationDealCreate.safeParse({
      ...validDeal,
      amountInKindTalent: 100,
      amountInKindCommunity: 2000,
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza dos trackers del mismo tipo en un trato', () => {
    const parsed = AutomationDealCreate.safeParse({
      ...validDeal,
      deliverables: [
        { type: 'preroll', targetCount: 5 },
        { type: 'preroll', targetCount: 2 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('acepta duración en meses para inferir fecha final', () => {
    const parsed = AutomationDealCreate.safeParse({
      ...validDeal,
      startDate: '2026-08-21',
      durationMonths: 6,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('automation deal schedule', () => {
  it('usa dos días después como inicio por defecto', () => {
    const schedule = resolveAutomationDealSchedule(
      {},
      new Date('2026-08-19T08:30:00.000Z'),
    );
    expect(schedule.startDate).toBe('2026-08-21');
    expect(schedule.endDate).toBeUndefined();
  });

  it('deriva fecha final y deadline desde duración mensual', () => {
    const schedule = resolveAutomationDealSchedule(
      { startDate: '2026-08-21', durationMonths: 6 },
      new Date('2026-08-19T08:30:00.000Z'),
    );
    expect(schedule).toEqual({
      startDate: '2026-08-21',
      endDate: '2027-02-21',
      deliveryDeadline: '2027-02-21',
    });
  });

  it('ajusta finales de mes sin generar fechas imposibles', () => {
    expect(addCalendarMonths('2026-08-31', 6)).toBe('2027-02-28');
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

describe('AutomationDealDraft', () => {
  it('acepta un borrador Discord con texto y propuesta canónica', () => {
    const parsed = AutomationDealDraftCreate.safeParse({
      externalId: 'discord:interaction:12345678',
      sourceUserId: 'discord-user-1',
      sourceChannelId: 'deal-channel-1',
      rawText: 'TODOCS2 con Marca Demo: cinco streams',
      proposedDeal: validDeal,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.source).toBe('discord');
  });

  it('acepta un borrador Discord incompleto para pedir campos faltantes', () => {
    const parsed = AutomationDealDraftCreate.safeParse({
      externalId: 'discord:message:12345678',
      sourceUserId: 'discord-user-1',
      sourceChannelId: 'deal-channel-1',
      rawText: 'The Real Fer x SkinsMonkey 6 meses, 12.000 EUR marca',
      proposedDeal: {
        brand: { name: 'SkinsMonkey' },
        amountBrand: 12000,
        currency: 'EUR',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('solo permite aprobar o rechazar con actor identificado', () => {
    expect(AutomationDealDraftReview.safeParse({ action: 'approve', reviewedBy: 'pablo' }).success).toBe(true);
    expect(AutomationDealDraftReview.safeParse({ action: 'create', reviewedBy: 'pablo' }).success).toBe(false);
    expect(AutomationDealDraftReview.safeParse({ action: 'approve', reviewedBy: '' }).success).toBe(false);
  });

  it('permite actualizar el borrador con una propuesta corregida', () => {
    expect(AutomationDealDraftReview.safeParse({
      action: 'update',
      reviewedBy: 'pablo',
      proposedDeal: validDeal,
    }).success).toBe(true);
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
