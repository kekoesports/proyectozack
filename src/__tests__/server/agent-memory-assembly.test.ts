/**
 * Ensamblado del bloque de memoria que ve el modelo.
 *
 * El filtro de scope ya se aplica en SQL (PR 1). Aquí se comprueba la segunda
 * capa: que la memoria de otro usuario o de otro agente no entre en el prompt
 * aunque la lista llegue de un caché, de un test o de un camino futuro que no
 * pase por aquella query.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  MAX_MEMORY_ITEMS,
  assembleMemoryBlock,
  type MemoryRow,
} from '@/lib/agents/memory';

const AHORA = new Date('2026-08-21T10:00:00.000Z');
const LECTOR = { agentId: 7, userId: 'u1' };

function fila(over: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 1,
    scope: 'global',
    scopeUserId: null,
    agentId: null,
    memoryKey: 'umbral-disco',
    content: 'El disco se considera crítico al 90 %.',
    sensitivity: 'internal',
    verificationStatus: 'verified',
    validUntil: null,
    sourceType: 'policy',
    ...over,
  };
}

describe('assembleMemoryBlock', () => {
  it('incluye los hechos verificados y vigentes', () => {
    const res = assembleMemoryBlock([fila()], LECTOR, AHORA);
    expect(res.text).toContain('umbral-disco');
    expect(res.text).toContain('90 %');
    expect(res.usedIds).toEqual([1]);
  });

  it('deja fuera lo que nadie verificó', () => {
    const res = assembleMemoryBlock([fila({ verificationStatus: 'proposed' })], LECTOR, AHORA);
    expect(res.text).toBe('');
    expect(res.skippedCount).toBe(1);
  });

  it('deja fuera lo revocado y lo caducado', () => {
    const revocada = fila({ id: 2, verificationStatus: 'revoked' });
    const caducada = fila({ id: 3, validUntil: new Date(AHORA.getTime() - 1000) });
    const res = assembleMemoryBlock([revocada, caducada], LECTOR, AHORA);
    expect(res.usedIds).toEqual([]);
    expect(res.skippedCount).toBe(2);
  });

  it('nunca inyecta memoria restringida, aunque esté verificada', () => {
    const res = assembleMemoryBlock([fila({ sensitivity: 'restricted' })], LECTOR, AHORA);
    expect(res.text).toBe('');
  });

  it('la memoria de otro usuario no entra', () => {
    const ajena = fila({ id: 9, scope: 'user', scopeUserId: 'u2' });
    const propia = fila({ id: 10, scope: 'user', scopeUserId: 'u1' });
    const res = assembleMemoryBlock([ajena, propia], LECTOR, AHORA);
    expect(res.usedIds).toEqual([10]);
  });

  it('la memoria de otro agente tampoco', () => {
    const otroAgente = fila({ id: 11, scope: 'agent', agentId: 99 });
    const mia = fila({ id: 12, scope: 'agent', agentId: 7 });
    const res = assembleMemoryBlock([otroAgente, mia], LECTOR, AHORA);
    expect(res.usedIds).toEqual([12]);
  });

  it('avisa al modelo de que la memoria no sustituye a una consulta', () => {
    const res = assembleMemoryBlock([fila()], LECTOR, AHORA);
    expect(res.text).toContain('NO contiene datos vivos');
  });

  it('acota el número de hechos', () => {
    const muchas = Array.from({ length: MAX_MEMORY_ITEMS + 10 }, (_, i) => fila({ id: i + 1 }));
    const res = assembleMemoryBlock(muchas, LECTOR, AHORA);
    expect(res.usedIds.length).toBeLessThanOrEqual(MAX_MEMORY_ITEMS);
    expect(res.truncated).toBe(true);
  });

  it('acota el tamaño total del bloque', () => {
    const largas = Array.from({ length: 20 }, (_, i) => fila({ id: i + 1, content: 'x'.repeat(1_000) }));
    const res = assembleMemoryBlock(largas, LECTOR, AHORA);
    expect(res.text.length).toBeLessThan(6_000);
    expect(res.truncated).toBe(true);
  });

  it('sin hechos admisibles devuelve bloque vacío, no un encabezado suelto', () => {
    const res = assembleMemoryBlock([], LECTOR, AHORA);
    expect(res.text).toBe('');
    expect(res.usedIds).toEqual([]);
  });

  it('un lector sin usuario no ve memoria de scope user', () => {
    const res = assembleMemoryBlock(
      [fila({ scope: 'user', scopeUserId: 'u1' })],
      { agentId: 7, userId: null },
      AHORA,
    );
    expect(res.usedIds).toEqual([]);
  });
});
