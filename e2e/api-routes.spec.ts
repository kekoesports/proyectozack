import { test, expect } from '@playwright/test';

test.describe('API routes', () => {
  // ── /api/contact ──────────────────────────────────────────────────────────

  test('POST /api/contact — valid payload → 200 { success: true }', async ({ request }) => {
    const resp = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        email: 'test@example.com',
        type: 'brand',
        message: 'This is a test message with enough characters.',
        company: 'Acme Corp',
        budget: '5-10K',
        timeline: '1 mes',
      },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  test('POST /api/contact — invalid payload (missing required fields) → 422', async ({ request }) => {
    const resp = await request.post('/api/contact', {
      data: {
        name: 'X', // too short (min 2 chars — actually 1 char fails min(2))
        // missing email, type, message
      },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json() as { error: string; issues: unknown[] };
    expect(body.error).toBe('Validation failed');
    expect(Array.isArray(body.issues)).toBe(true);
  });

  test('POST /api/contact — non-JSON body → 400', async ({ request }) => {
    const resp = await request.post('/api/contact', {
      headers: { 'Content-Type': 'text/plain' },
      data: 'not json at all',
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json() as { error: string };
    expect(body.error).toBe('Invalid JSON');
  });

  // ── /api/creator-apply ────────────────────────────────────────────────────

  test('POST /api/creator-apply — valid payload → 200 { success: true }', async ({ request }) => {
    const resp = await request.post('/api/creator-apply', {
      data: {
        name: 'Creator Name',
        email: 'creator@example.com',
        platform: 'YouTube',
        handle: '@mychannel',
        followers: '50000',
        message: 'I want to join the platform.',
      },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  test('POST /api/creator-apply — invalid payload (missing required fields) → 422', async ({ request }) => {
    const resp = await request.post('/api/creator-apply', {
      data: {
        name: 'Creator Name',
        // missing email, platform, handle
      },
    });
    expect(resp.status()).toBe(422);
    const body = await resp.json() as { error: string; issues: unknown[] };
    expect(body.error).toBe('Validation failed');
    expect(Array.isArray(body.issues)).toBe(true);
  });

  // ── /api/marcas/proposals ─────────────────────────────────────────────────
  // This route calls auth.api.getSession() directly (not requireRole), so the
  // dev bypass in auth-guard.ts does NOT apply. Without a real session cookie
  // the route returns 401 in all environments.

  test('POST /api/marcas/proposals — unauthenticated → 401', async ({ request }) => {
    const resp = await request.post('/api/marcas/proposals', {
      data: {
        talentId: 1,
        campaignType: 'YouTube',
        budgetRange: '5-10K',
        timeline: '1 mes',
        message: 'This is a test proposal message.',
      },
    });
    expect(resp.status()).toBe(401);
    const body = await resp.json() as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  // ── /api/admin/invoices/export ────────────────────────────────────────────
  // requireRole('admin') uses dev bypass → returns mock admin session in dev.
  // modelo=347 does not require a quarter parameter.

  test('GET /api/admin/invoices/export?modelo=347&year=2026 → 200 text/csv', async ({ request }) => {
    const resp = await request.get('/api/admin/invoices/export?modelo=347&year=2026');
    expect(resp.status()).toBe(200);
    const contentType = resp.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/csv');
  });

  // ── /api/admin/search ─────────────────────────────────────────────────────
  // requireAnyRole uses dev bypass → returns mock admin session in dev.

  test('GET /api/admin/search?q=ab → 200 with groups object and tookMs number', async ({ request }) => {
    const resp = await request.get('/api/admin/search?q=ab');
    expect(resp.status()).toBe(200);
    const body = await resp.json() as { groups: Record<string, unknown[]>; tookMs: number };
    expect(typeof body.groups).toBe('object');
    expect(body.groups).not.toBeNull();
    expect(typeof body.tookMs).toBe('number');
  });

  // ── /api/giveaways/click ──────────────────────────────────────────────────

  test('POST /api/giveaways/click — missing codeId and action → 400', async ({ request }) => {
    const resp = await request.post('/api/giveaways/click', {
      data: {},
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json() as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  test('POST /api/giveaways/click — valid shape but non-existent codeId → 404', async ({ request }) => {
    // codeId 999999 is extremely unlikely to exist in any environment.
    const resp = await request.post('/api/giveaways/click', {
      data: { codeId: 999999, action: 'copy' },
    });
    // Route returns 404 when the code row is not found.
    expect(resp.status()).toBe(404);
    const body = await resp.json() as { ok: boolean };
    expect(body.ok).toBe(false);
  });
});
