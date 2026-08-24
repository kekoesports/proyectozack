jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));

const verifyAutomationToken = jest.fn();
const ingestAgentEvent = jest.fn();

jest.mock('@/lib/security/assertAutomationAuth', () => ({
  verifyAutomationToken: (request: Request) => verifyAutomationToken(request),
}));
jest.mock('@/lib/queries/agents/events', () => ({
  ingestAgentEvent: (...args: unknown[]) => ingestAgentEvent(...args),
}));

import { POST } from '@/app/api/automation/seo/search-console/route';

const SNAPSHOT = {
  property: 'https://socialpro.es/',
  collectedAt: '2026-08-24T20:00:00+02:00',
  period: { startDate: '2026-07-28', endDate: '2026-08-24' },
  coverage: { indexed: 107, notIndexed: 749, source: 'search-console-ui' },
  performance: { clicks: 482, impressions: 10_000, ctr: 0.0482, averagePosition: 12.4 },
  sitemaps: [],
  topQueries: [],
  observations: ['La consulta skinsmonkey perdió impresiones frente al periodo anterior.'],
} as const;

function request(body: unknown): Request {
  return new Request('https://socialpro.es/api/automation/seo/search-console', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  verifyAutomationToken.mockReturnValue({ ok: true });
  ingestAgentEvent.mockResolvedValue({ event: { id: 33 }, deduplicated: false });
});

it('rechaza peticiones sin la credencial de automatización', async () => {
  verifyAutomationToken.mockReturnValue({ ok: false, reason: 'unauthorized' });
  const response = await POST(request(SNAPSHOT));
  expect(response.status).toBe(401);
  expect(ingestAgentEvent).not.toHaveBeenCalled();
});
it('valida y guarda un snapshot mínimo sin datos personales', async () => {
  const response = await POST(request(SNAPSHOT));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, eventId: 33, deduplicated: false });
  expect(ingestAgentEvent).toHaveBeenCalledWith(expect.objectContaining({
    source: 'google-search-console',
    eventType: 'seo.search_console_snapshot',
    externalId: 'daily:2026-08-24',
    severity: 'info',
    payloadJson: expect.objectContaining({ property: 'https://socialpro.es/' }),
  }));
});

it('rechaza otras propiedades y métricas inválidas', async () => {
  const response = await POST(request({
    ...SNAPSHOT,
    property: 'https://example.com/',
    performance: { ...SNAPSHOT.performance, ctr: 2 },
  }));
  expect(response.status).toBe(400);
  expect(ingestAgentEvent).not.toHaveBeenCalled();
});
