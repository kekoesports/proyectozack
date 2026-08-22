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
});
