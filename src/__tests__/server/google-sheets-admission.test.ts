jest.mock('@/lib/env', () => ({ env: { GOOGLE_SHEETS_API_KEY: 'fixture-key' } }));

function response(body: unknown = {}, status = 200, retryAfter?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: retryAfter === undefined ? {} : { 'retry-after': retryAfter },
  });
}

describe('Sheets HTTP admission — isolated clock, HTTP and credentials', () => {
  const originalFetch = global.fetch;
  let starts: number[];
  let fetchMock: jest.MockedFunction<typeof fetch>;
  const base = Date.UTC(2026, 8, 6);

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(base);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    globalThis.socialProSheetsAdmission = undefined;
    starts = [];
    fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(async () => {
      starts.push(Date.now() - base);
      return response();
    });
    global.fetch = fetchMock;
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    globalThis.socialProSheetsAdmission = undefined;
  });

  it('paces concurrent metadata, tabs and grid consumers in FIFO order', async () => {
    const sheets = await import('@/lib/integrations/google-sheets');
    const results = Promise.all([
      sheets.listSheetTabs('fixture-a'),
      sheets.readSheetGrid('fixture-b', 'Fixture'),
      sheets.fetchSpreadsheetMetadata('fixture-c'),
    ]);
    await jest.runAllTimersAsync();
    await expect(results).resolves.toEqual([[], [], { title: '', tabs: [] }]);
    expect(starts).toEqual([0, 1500, 3000]);
  });

  it('retains admission across separate server module loads', async () => {
    const first = await import('@/lib/integrations/google-sheets');
    await first.listSheetTabs('fixture-a');
    jest.resetModules();
    const second = await import('@/lib/integrations/google-sheets');
    const result = second.fetchSpreadsheetMetadata('fixture-b');
    await jest.runAllTimersAsync();
    await result;
    expect(starts).toEqual([0, 1500]);
  });

  it('never exceeds 40 starts in any rolling minute within this process', async () => {
    const sheets = await import('@/lib/integrations/google-sheets');
    const results = Promise.all(Array.from({ length: 100 }, (_, index) =>
      sheets.listSheetTabs(`fixture-${index}`, { deadlineAt: base + 300_000 })));
    await jest.runAllTimersAsync();
    await results;
    expect(starts).toHaveLength(100);
    for (const start of starts) {
      expect(starts.filter((time) => time >= start && time < start + 60_000).length).toBeLessThanOrEqual(40);
    }
  });

  it('a delayed 429 pushes back already queued consumers and its own retry', async () => {
    fetchMock.mockImplementationOnce(() => {
      starts.push(Date.now() - base);
      return new Promise((resolve) => setTimeout(() => resolve(response({}, 429, '6')), 500));
    });
    const sheets = await import('@/lib/integrations/google-sheets');
    const results = Promise.all([
      sheets.listSheetTabs('fixture-a'),
      sheets.fetchSpreadsheetMetadata('fixture-b'),
      sheets.readSheetGrid('fixture-c', 'Fixture'),
    ]);
    await jest.runAllTimersAsync();
    await results;
    expect(starts).toEqual([0, 6500, 8000, 9500]);
  });

  it.each([undefined, 'invalid', '-1'])('uses a 60s shared cooldown with Retry-After=%s', async (header) => {
    fetchMock.mockImplementationOnce(async () => {
      starts.push(0);
      return response({}, 429, header);
    });
    const sheets = await import('@/lib/integrations/google-sheets');
    const options = { deadlineAt: base + 105_000 };
    const results = Promise.all([
      sheets.listSheetTabs('fixture-a', options),
      sheets.fetchSpreadsheetMetadata('fixture-b', options),
    ]);
    await jest.runAllTimersAsync();
    await results;
    expect(starts).toEqual([0, 60_000, 61_500]);
  });

  it.each(['60', new Date(base + 60_000).toUTCString()])('honors the full provider floor %s', async (header) => {
    fetchMock.mockImplementationOnce(async () => {
      starts.push(0);
      return response({}, 429, header);
    });
    const sheets = await import('@/lib/integrations/google-sheets');
    const result = sheets.listSheetTabs('fixture-a', { deadlineAt: base + 105_000 });
    await jest.runAllTimersAsync();
    await result;
    expect(starts).toEqual([0, 60_000]);
  });

  it('defers a short-lived consumer immediately without blocking a longer budget', async () => {
    fetchMock.mockImplementationOnce(async () => {
      starts.push(0);
      return response({}, 429, '60');
    });
    const sheets = await import('@/lib/integrations/google-sheets');
    const outcomes = Promise.allSettled([
      sheets.listSheetTabs('fixture-a', { deadlineAt: base + 105_000 }),
      sheets.readSheetGrid('fixture-b', 'Fixture'),
    ]);
    await jest.advanceTimersByTimeAsync(0);
    expect(starts).toEqual([0]);
    await jest.runAllTimersAsync();
    const [first, second] = await outcomes;
    expect(first?.status).toBe('fulfilled');
    expect(second).toMatchObject({ status: 'rejected', reason: { name: 'SheetsDeadlineError' } });
    expect(starts).toEqual([0, 60_000]);
  });

  it('does not dispatch a retry or queued call when Retry-After exceeds both budgets', async () => {
    fetchMock.mockImplementationOnce(async () => {
      starts.push(0);
      return response({}, 429, '120');
    });
    const sheets = await import('@/lib/integrations/google-sheets');
    const outcomes = Promise.allSettled([
      sheets.listSheetTabs('fixture-a', { deadlineAt: base + 105_000 }),
      sheets.readSheetGrid('fixture-b', 'Fixture'),
    ]);
    await jest.runAllTimersAsync();
    expect((await outcomes).every((outcome) => outcome.status === 'rejected')).toBe(true);
    expect(starts).toEqual([0]);
    expect(Date.now()).toBe(base);
    await expect(sheets.listSheetTabs('fixture-c')).rejects.toMatchObject({ name: 'SheetsDeadlineError' });
    expect(starts).toEqual([0]);
  });

  it('rejects before HTTP if the full request timeout cannot fit', async () => {
    const sheets = await import('@/lib/integrations/google-sheets');
    await expect(sheets.readSheetGrid('fixture', 'Fixture', { deadlineAt: base + 29_999 }))
      .rejects.toMatchObject({ name: 'SheetsDeadlineError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a body that finishes after the shared deadline', async () => {
    const slow = response();
    jest.spyOn(slow, 'json').mockImplementation(async () => {
      jest.setSystemTime(base + 106_000);
      return {};
    });
    fetchMock.mockResolvedValueOnce(slow);
    const sheets = await import('@/lib/integrations/google-sheets');
    await expect(sheets.listSheetTabs('fixture', { deadlineAt: base + 105_000 }))
      .rejects.toMatchObject({ name: 'SheetsDeadlineError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([403, 404, 500])('does not retry HTTP %s or expose its body', async (status) => {
    const rejected = response({ error: { message: 'PRIVATE_FIXTURE', reason: 'quotaExceeded' } }, status);
    const bodyRead = jest.spyOn(rejected, 'json');
    fetchMock.mockResolvedValueOnce(rejected);
    const sheets = await import('@/lib/integrations/google-sheets');
    await expect(sheets.listSheetTabs('fixture')).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyRead).not.toHaveBeenCalled();
  });

  it('keeps a final 429 cooldown after exhausting the third attempt', async () => {
    fetchMock.mockImplementation(async () => {
      starts.push(Date.now() - base);
      return response({}, 429, starts.length === 3 ? '60' : '0');
    });
    const sheets = await import('@/lib/integrations/google-sheets');
    const outcome = sheets.listSheetTabs('fixture', { deadlineAt: base + 300_000 }).catch((error: unknown) => error);
    await jest.runAllTimersAsync();
    expect(await outcome).toMatchObject({ status: 429 });
    expect(starts).toEqual([0, 1500, 3500]);
    await expect(sheets.listSheetTabs('fixture-next')).rejects.toMatchObject({ name: 'SheetsDeadlineError' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
