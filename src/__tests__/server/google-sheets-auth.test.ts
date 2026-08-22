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
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('lee una hoja privada con Bearer de la cuenta de servicio', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'oauth-token', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({
        sheets: [{ properties: { sheetId: 7, title: 'Seguimiento', index: 0 } }],
      }));
    global.fetch = fetchMock as typeof fetch;

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
    global.fetch = fetchMock as typeof fetch;

    const { fetchSpreadsheetMetadata } = await import('@/lib/integrations/google-sheets');
    await expect(fetchSpreadsheetMetadata('public-sheet')).resolves.toEqual({
      title: 'Tracker público',
      tabs: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toContain('key=public-api-key');
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toBeUndefined();
  });
});
