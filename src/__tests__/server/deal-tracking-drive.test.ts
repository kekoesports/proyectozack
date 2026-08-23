jest.mock('server-only', () => ({}));

jest.mock('@/lib/env', () => ({
  env: {
    GOOGLE_DRIVE_DEAL_TEMPLATE_ID: 'template-1234567890',
    GOOGLE_DRIVE_TRACKING_FOLDER_ID: 'fallback-1234567890',
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

import { createDealTrackingSheet } from '@/lib/drive/deal-tracking-sheet';

describe('createDealTrackingSheet', () => {
  it('copia en la carpeta del creador y comparte la hoja como editor', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'sheet-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'permission-123' }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const result = await createDealTrackingSheet('KeyDrop', 'NAOW', {
      folderId: 'creator-folder-1234567890',
      shareWithEmail: 'creator@example.com',
    });

    expect(result).toEqual({
      ok: true,
      spreadsheetId: 'sheet-123',
      url: 'https://docs.google.com/spreadsheets/d/sheet-123/edit',
      name: 'KeyDrop - NAOW',
      destination: 'creator',
      shareStatus: 'shared',
      warnings: [],
    });

    const copyCall = fetchMock.mock.calls[1];
    expect(copyCall?.[0]).toContain('/template-1234567890/copy?supportsAllDrives=true');
    expect(JSON.parse(String(copyCall?.[1]?.body))).toEqual({
      name: 'KeyDrop - NAOW',
      parents: ['creator-folder-1234567890'],
    });

    const permissionCall = fetchMock.mock.calls[2];
    expect(permissionCall?.[0]).toContain('/sheet-123/permissions?supportsAllDrives=true');
    expect(JSON.parse(String(permissionCall?.[1]?.body))).toEqual({
      type: 'user',
      role: 'writer',
      emailAddress: 'creator@example.com',
    });
  });

  it('usa la carpeta corporativa si la carpeta personal rechaza la copia', async () => {
    jest.resetModules();
    const { createDealTrackingSheet: createFreshDealTrackingSheet } = await import(
      '@/lib/drive/deal-tracking-sheet'
    );
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { errors: [{ reason: 'storageQuotaExceeded' }] },
      }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'sheet-fallback' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'permission-fallback' }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const result = await createFreshDealTrackingSheet('KeyDrop', 'TODOCS2', {
      folderId: 'personal-folder-1234567890',
      shareWithEmail: 'todocs2@example.com',
    });

    expect(result).toEqual({
      ok: true,
      spreadsheetId: 'sheet-fallback',
      url: 'https://docs.google.com/spreadsheets/d/sheet-fallback/edit',
      name: 'KeyDrop - TODOCS2',
      destination: 'fallback',
      shareStatus: 'shared',
      warnings: ['la carpeta personal no admite copias automáticas; se usó la carpeta corporativa'],
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      name: 'KeyDrop - TODOCS2',
      parents: ['personal-folder-1234567890'],
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      name: 'KeyDrop - TODOCS2',
      parents: ['fallback-1234567890'],
    });
  });
});
