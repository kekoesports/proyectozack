jest.mock('@/lib/env', () => ({
  env: {
    GOOGLE_SHEETS_API_KEY: 'public-api-key',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'robot@example.iam.gserviceaccount.com',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'fake-private-key',
  },
}));

jest.mock('crypto', () => ({
  createSign: () => ({
    update: jest.fn(),
    sign: () => Buffer.from('signed'),
  }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Google Sheets — autenticación privada y fallback público', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.useFakeTimers();
    globalThis.socialProSheetsAdmission = undefined;
  });
  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('lee una hoja privada con Bearer de la cuenta de servicio', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'oauth-token', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({
        sheets: [{ properties: { sheetId: 7, title: 'Seguimiento', index: 0 } }],
      }));
    global.fetch = fetchMock;

    const { listSheetTabs } = await import('@/lib/integrations/google-sheets');
    await expect(listSheetTabs('private-sheet')).resolves.toEqual([
      { sheetId: '7', title: 'Seguimiento', index: 0 },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain('key=');
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({ Authorization: 'Bearer oauth-token' });
  });

  it('si la cuenta no ve una hoja pública, conserva el fallback por API key', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'oauth-token', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ error: 'forbidden' }, 403))
      .mockResolvedValueOnce(jsonResponse({
        properties: { title: 'Tracker público' },
        sheets: [],
      }));
    global.fetch = fetchMock;

    const { fetchSpreadsheetMetadata } = await import('@/lib/integrations/google-sheets');
    const result = fetchSpreadsheetMetadata('public-sheet');
    await jest.runAllTimersAsync();
    await expect(result).resolves.toEqual({
      title: 'Tracker público',
      tabs: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toContain('key=public-api-key');
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toBeUndefined();
  });

  it('paces all 48 Sheets calls of a synthetic 12-campaign dual-auth batch', async () => {
    const base = Date.now();
    const starts: number[] = [];
    const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(async (input, init) => {
      if (String(input).startsWith('https://oauth2.googleapis.com/')) {
        return jsonResponse({ access_token: 'fixture-token', expires_in: 3600 });
      }
      starts.push(Date.now() - base);
      if (new Headers(init?.headers).has('Authorization')) return jsonResponse({}, 403);
      return jsonResponse({ sheets: [{ properties: { sheetId: 0, title: 'Fixture', index: 0 }, data: [] }] });
    });
    global.fetch = fetchMock;
    const { listSheetTabs, readSheetGrid } = await import('@/lib/integrations/google-sheets');
    const { createLimit } = await import('@/lib/utils/concurrencyLimit');
    const limit = createLimit(3);
    const options = { deadlineAt: base + 105_000 };
    const result = Promise.all(Array.from({ length: 12 }, (_, index) => limit(async () => {
      await listSheetTabs(`fixture-${index}`, options);
      await readSheetGrid(`fixture-${index}`, 'Fixture', options);
    })));
    await jest.runAllTimersAsync();
    await result;
    expect(starts).toEqual(Array.from({ length: 48 }, (_, index) => index * 1500));
    expect(starts[47]).toBe(70_500);
  });

  it('does not turn an OAuth 429 or deadline deferral into an API-key fallback', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'fixture-token', expires_in: 3600 }))
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'retry-after': '120' } }));
    global.fetch = fetchMock;
    const { listSheetTabs } = await import('@/lib/integrations/google-sheets');
    await expect(listSheetTabs('fixture')).rejects.toMatchObject({ name: 'SheetsDeadlineError' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url] of fetchMock.mock.calls) expect(String(url)).not.toContain('key=');
  });
});
