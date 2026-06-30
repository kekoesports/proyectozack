/**
 * Tests del limitador de concurrencia inline.
 * Sin dependencias externas.
 */
import { createLimit } from '@/lib/utils/concurrencyLimit';

describe('createLimit', () => {
  it('rechaza maxConcurrency inválido', () => {
    expect(() => createLimit(0)).toThrow();
    expect(() => createLimit(-1)).toThrow();
    expect(() => createLimit(1.5)).toThrow();
  });

  it('procesa todas las tareas con concurrencia exacta', async () => {
    const limit = createLimit(2);
    let inFlight = 0;
    let maxInFlight = 0;
    const tick = (delay: number) =>
      limit(async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise<void>((r) => setTimeout(r, delay));
        inFlight--;
        return delay;
      });

    const results = await Promise.all([tick(10), tick(10), tick(10), tick(10), tick(10)]);
    expect(results).toHaveLength(5);
    expect(maxInFlight).toBe(2);
  });

  it('una tarea que falla no bloquea el resto', async () => {
    const limit = createLimit(2);
    const results = await Promise.allSettled([
      limit(async () => 1),
      limit(() => Promise.reject(new Error('fail'))),
      limit(async () => 3),
    ]);
    expect(results[0]?.status).toBe('fulfilled');
    expect(results[1]?.status).toBe('rejected');
    expect(results[2]?.status).toBe('fulfilled');
  });

  it('limit(fn) propaga el valor de retorno', async () => {
    const limit = createLimit(3);
    const v = await limit(async () => ({ a: 1, b: 'x' }));
    expect(v).toEqual({ a: 1, b: 'x' });
  });
});
