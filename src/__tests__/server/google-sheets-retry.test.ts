/**
 * Tests de `withRetry` y `SheetsApiError` en la integración con Google Sheets.
 *
 * Garantiza el comportamiento exigido para mitigar el 429 del cron diario:
 *   - 429 reintenta hasta 3 intentos total (1 + 2 retries).
 *   - Respeta Retry-After si Google lo envía.
 *   - Aplica backoff exponencial + jitter si no hay Retry-After.
 *   - 403/404/5xx NO se reintentan (se propagan).
 *   - Tras agotar reintentos, error controlado (SheetsApiError 429).
 */

jest.mock('@/lib/env', () => ({
  env: { GOOGLE_SHEETS_API_KEY: 'test-key-abc' },
}));

import { withRetry, SheetsApiError } from '@/lib/integrations/google-sheets';

// Sleep mock que cuenta y resuelve inmediato (no esperamos en tests).
function makeSpySleep() {
  const waits: number[] = [];
  const sleep = (ms: number): Promise<void> => { waits.push(ms); return Promise.resolve(); };
  return { sleep, waits };
}

describe('withRetry — comportamiento', () => {
  it('[2] reintenta en 429 hasta máximo de 3 intentos totales', async () => {
    const { sleep, waits } = makeSpySleep();
    const fn = jest.fn(() => Promise.reject(new SheetsApiError('rate', 429)));

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1000, sleep }),
    ).rejects.toBeInstanceOf(SheetsApiError);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(waits).toHaveLength(2); // 2 esperas entre 3 intentos
  });

  it('[3] respeta Retry-After del header si es mayor que el backoff exponencial', async () => {
    const { sleep, waits } = makeSpySleep();
    // Retry-After = 5s — supera el backoff base de 1s
    let attempt = 0;
    const fn = jest.fn(() => {
      attempt++;
      if (attempt < 3) return Promise.reject(new SheetsApiError('rl', 429, 5));
      return Promise.resolve('ok');
    });

    const out = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1000, sleep });
    expect(out).toBe('ok');
    // Cada espera debería estar cerca de 5s (5000ms ± 20% jitter = 4000-6000)
    for (const w of waits) {
      expect(w).toBeGreaterThanOrEqual(4000);
      expect(w).toBeLessThanOrEqual(6000);
    }
  });

  it('[4] aplica backoff exponencial + jitter ±20% cuando NO hay Retry-After', async () => {
    const { sleep, waits } = makeSpySleep();
    const fn = jest.fn(() => Promise.reject(new SheetsApiError('rl', 429)));

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1000, sleep }),
    ).rejects.toBeInstanceOf(SheetsApiError);

    // Primera espera: 1000ms ± 20% → [800, 1200]
    expect(waits[0]).toBeGreaterThanOrEqual(800);
    expect(waits[0]).toBeLessThanOrEqual(1200);
    // Segunda espera: 2000ms ± 20% → [1600, 2400]
    expect(waits[1]).toBeGreaterThanOrEqual(1600);
    expect(waits[1]).toBeLessThanOrEqual(2400);
  });

  it('[6] 403 NO se reintenta — se propaga al primer intento', async () => {
    const { sleep, waits } = makeSpySleep();
    const fn = jest.fn(() => Promise.reject(new SheetsApiError('forbidden', 403)));

    await expect(withRetry(fn, { sleep })).rejects.toMatchObject({ status: 403 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(waits).toHaveLength(0);
  });

  it('[6b] 404 NO se reintenta', async () => {
    const { sleep, waits } = makeSpySleep();
    const fn = jest.fn(() => Promise.reject(new SheetsApiError('nf', 404)));
    await expect(withRetry(fn, { sleep })).rejects.toMatchObject({ status: 404 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(waits).toHaveLength(0);
  });

  it('[6c] 500 NO se reintenta (decisión aprobada: solo 429)', async () => {
    const { sleep } = makeSpySleep();
    const fn = jest.fn(() => Promise.reject(new SheetsApiError('srv', 500)));
    await expect(withRetry(fn, { sleep })).rejects.toMatchObject({ status: 500 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('error genérico (no SheetsApiError) NO se reintenta', async () => {
    const { sleep } = makeSpySleep();
    const fn = jest.fn(() => Promise.reject(new TypeError('boom')));
    await expect(withRetry(fn, { sleep })).rejects.toBeInstanceOf(TypeError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('si fn resuelve en el 2º intento, withRetry devuelve el valor', async () => {
    const { sleep, waits } = makeSpySleep();
    let attempt = 0;
    const fn = jest.fn(() => {
      attempt++;
      if (attempt === 1) return Promise.reject(new SheetsApiError('rl', 429));
      return Promise.resolve(42);
    });
    const out = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, sleep });
    expect(out).toBe(42);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(waits).toHaveLength(1);
  });
});
