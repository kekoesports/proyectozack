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

import {
  buildDealContentRows,
  createDealTrackingSheet,
} from '@/lib/drive/deal-tracking-sheet';

const deal = {
  campaignId: 98,
  talentId: 5,
  startDate: '2026-08-24',
  endDate: '2026-09-24',
  deliverables: [
    { type: 'stream_integration', targetCount: 2, notes: 'Directos KeyDrop' },
    { type: 'short_reel_tiktok', targetCount: 3 },
  ],
};

describe('buildDealContentRows', () => {
  it('expande cada objetivo en una fila por pieza', () => {
    expect(buildDealContentRows(deal.deliverables)).toEqual([
      ['STR-01', 'Stream', 1, 'Pendiente', '', '', '', 'Pendiente', 'Directos KeyDrop'],
      ['STR-02', 'Stream', 2, 'Pendiente', '', '', '', 'Pendiente', 'Directos KeyDrop'],
      ['SHORT-01', 'Short', 1, 'Pendiente', '', '', '', 'Pendiente', ''],
      ['SHORT-02', 'Short', 2, 'Pendiente', '', '', '', 'Pendiente', ''],
      ['SHORT-03', 'Short', 3, 'Pendiente', '', '', '', 'Pendiente', ''],
    ]);
  });
});

describe('createDealTrackingSheet', () => {
  it('copia en la carpeta del creador y comparte la hoja como editor', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'sheet-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'permission-123' }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const result = await createDealTrackingSheet('KeyDrop', 'NAOW', {
      folderId: 'creator-folder-1234567890',
      shareWithEmail: 'creator@example.com',
      deal,
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
      appProperties: {
        socialproCampaignId: '98',
        socialproTalentId: '5',
      },
    });

    const clearCall = fetchMock.mock.calls[2];
    expect(clearCall?.[0]).toContain("/values/'Seguimiento'!A7%3AI60:clear");

    const valuesCall = fetchMock.mock.calls[3];
    expect(valuesCall?.[0]).toContain('/sheet-123/values:batchUpdate');
    const valuesBody = JSON.parse(String(valuesCall?.[1]?.body)) as {
      data: Array<{ range: string; values: unknown[][] }>;
    };
    expect(valuesBody.data).toEqual(expect.arrayContaining([
      { range: "'Seguimiento'!B2", values: [['NAOW']] },
      { range: "'Seguimiento'!E2", values: [['KeyDrop']] },
      { range: "'Seguimiento'!H2", values: [[98]] },
      {
        range: "'Seguimiento'!A7:I11",
        values: buildDealContentRows(deal.deliverables),
      },
    ]));

    const permissionCall = fetchMock.mock.calls[4];
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
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'permission-fallback' }), { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const result = await createFreshDealTrackingSheet('KeyDrop', 'TODOCS2', {
      folderId: 'personal-folder-1234567890',
      shareWithEmail: 'todocs2@example.com',
      deal,
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
      appProperties: {
        socialproCampaignId: '98',
        socialproTalentId: '5',
      },
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      name: 'KeyDrop - TODOCS2',
      parents: ['fallback-1234567890'],
      appProperties: {
        socialproCampaignId: '98',
        socialproTalentId: '5',
      },
    });
  });

  it('amplía la tabla y sus fórmulas cuando el trato supera las 54 piezas', async () => {
    jest.resetModules();
    const { createDealTrackingSheet: createFreshDealTrackingSheet } = await import(
      '@/lib/drive/deal-tracking-sheet'
    );
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'sheet-large' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    const result = await createFreshDealTrackingSheet('KeyDrop', 'NAOW', {
      folderId: 'creator-folder-1234567890',
      deal: {
        campaignId: 99,
        talentId: 7,
        deliverables: [{ type: 'preroll', targetCount: 55 }],
      },
    });

    expect(result).toMatchObject({ ok: true, spreadsheetId: 'sheet-large' });
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/sheet-large:batchUpdate');
    const expansion = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
    expect(expansion.requests[0]).toEqual({
      appendDimension: { sheetId: 0, dimension: 'ROWS', length: 1 },
    });
    const values = JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body)) as {
      data: Array<{ range: string; values: unknown[][] }>;
    };
    expect(values.data).toEqual(expect.arrayContaining([
      { range: "'Seguimiento'!F4", values: [['=COUNTA(A7:A61)']] },
      expect.objectContaining({ range: "'Seguimiento'!A7:I61" }),
    ]));
  });
});
