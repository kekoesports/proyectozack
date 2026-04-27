jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 're_test_000',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-minimum-padding-xx',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));

const mockRollOverPendingTasks = jest.fn();
const mockRegenerateRecurringTasks = jest.fn();

jest.mock('@/lib/queries/crmTasks', () => ({
  rollOverPendingTasks: (...args: unknown[]) => mockRollOverPendingTasks(...args),
  regenerateRecurringTasks: (...args: unknown[]) => mockRegenerateRecurringTasks(...args),
}));

jest.mock('@/lib/week', () => ({
  getIsoWeekLabel: jest.fn(() => '2026-W19'),
  previousWeek: jest.fn(() => '2026-W18'),
}));

import { GET } from '@/app/api/cron/rollover-tasks/route';

describe('rollover-tasks cron route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'top-secret';
  });

  it('returns unauthorized when the bearer token is missing', async () => {
    const req = new Request('http://localhost/api/cron/rollover-tasks');
    const response = await GET(req as never);

    expect(response.status).toBe(401);
  });

  it('returns 503 when CRON_SECRET is not configured and request is not from Vercel cron', async () => {
    delete process.env.CRON_SECRET;

    const req = new Request('http://localhost/api/cron/rollover-tasks');
    const response = await GET(req as never);

    expect(response.status).toBe(503);
  });

  it('accepts requests from Vercel cron via x-vercel-cron header without secret', async () => {
    delete process.env.CRON_SECRET;
    mockRollOverPendingTasks.mockResolvedValue({ rolled: 0 });
    mockRegenerateRecurringTasks.mockResolvedValue({ generated: 0 });

    const req = new Request('http://localhost/api/cron/rollover-tasks', {
      headers: { 'x-vercel-cron': '1' },
    });
    const response = await GET(req as never);

    expect(response.status).toBe(200);
  });

  it('runs rollover and recurring regeneration in one request', async () => {
    mockRollOverPendingTasks.mockResolvedValue({ rolled: 4 });
    mockRegenerateRecurringTasks.mockResolvedValue({ generated: 18 });

    const req = new Request('http://localhost/api/cron/rollover-tasks', {
      headers: { authorization: 'Bearer top-secret' },
    });
    const response = await GET(req as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRollOverPendingTasks).toHaveBeenCalledWith('2026-W18', '2026-W19');
    expect(mockRegenerateRecurringTasks).toHaveBeenCalled();
    expect(body).toEqual(
      expect.objectContaining({ success: true, rolled: 4, generated: 18, from: '2026-W18', to: '2026-W19' }),
    );
  });
});
