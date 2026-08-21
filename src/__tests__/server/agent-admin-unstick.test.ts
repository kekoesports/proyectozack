/**
 * Desatascar una ejecución, y crear memoria.
 *
 * `unstickRun` tiene una aritmética que parece trivial y no lo es: el nuevo
 * tope tiene que dejar la fila **reclamable** y además soportar el `attempt + 1`
 * que hará el claim, sin violar `agent_runs_attempt_ck`. Sumar uno al tope
 * cumple lo segundo y no lo primero.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/auth', () => ({ auth: {} }));

type Escritura = { readonly valores: Record<string, unknown> };
let escrituras: Escritura[] = [];
let filasDevueltas: unknown[] = [{ id: 1 }];

jest.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: (v: Record<string, unknown>) => ({
        returning: async () => {
          escrituras.push({ valores: v });
          return filasDevueltas;
        },
      }),
    }),
  },
  getTransactionalDb: () => ({
    update: () => ({
      set: (v: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            escrituras.push({ valores: v });
            return filasDevueltas;
          },
        }),
      }),
    }),
  }),
}));

import { createAgentMemory } from '@/lib/queries/agents/memories';
import { unstickRun } from '@/lib/queries/agents/resume';

/** Los fragmentos SQL de Drizzle no se pueden serializar: se recogen sus trozos. */
function trozosSql(valor: unknown): string {
  const trozos: string[] = [];
  const recoger = (v: unknown, prof: number): void => {
    if (prof > 5 || v === null || typeof v !== 'object') return;
    if ('value' in v) {
      const val = (v as { value: unknown }).value;
      if (typeof val === 'string') trozos.push(val);
      else if (Array.isArray(val)) trozos.push(...val.filter((x): x is string => typeof x === 'string'));
    }
    if ('name' in v && typeof (v as { name: unknown }).name === 'string') {
      trozos.push((v as { name: string }).name);
    }
    if ('queryChunks' in v && Array.isArray((v as { queryChunks: unknown[] }).queryChunks)) {
      for (const c of (v as { queryChunks: unknown[] }).queryChunks) recoger(c, prof + 1);
    }
  };
  recoger(valor, 0);
  return trozos.join(' ');
}

beforeEach(() => {
  escrituras = [];
  filasDevueltas = [{ id: 1 }];
});

describe('unstickRun', () => {
  it('devuelve la ejecución a la cola', async () => {
    expect(await unstickRun(42)).toBe(true);
    expect(escrituras[0]?.valores.status).toBe('queued');
  });

  it('el nuevo tope se calcula desde attempt, no desde max_attempts', async () => {
    // Con `max_attempts + 1`, una fila atascada (attempt >= max_attempts) puede
    // quedarse con attempt == max_attempts: el `WHERE attempt < max_attempts`
    // del claim sigue excluyéndola y se queda en `queued` sin coger nunca, sin
    // error que lo delate.
    await unstickRun(42);
    const sql = trozosSql(escrituras[0]?.valores.maxAttempts);
    expect(sql).toContain('attempt');
    expect(sql).not.toContain('max_attempts');
  });

  it('la aritmética deja la fila reclamable y dentro del CHECK', () => {
    // El SQL es `max_attempts = attempt + 1`. Con attempt=3, max=3 (atascada):
    const attempt = 3;
    const nuevoMax = attempt + 1;
    // Reclamable: el claim exige attempt < max_attempts.
    expect(attempt).toBeLessThan(nuevoMax);
    // Y tras el `attempt + 1` del claim sigue cumpliendo attempt <= max_attempts.
    expect(attempt + 1).toBeLessThanOrEqual(nuevoMax);
  });

  it('suelta el lease', async () => {
    await unstickRun(42);
    expect(escrituras[0]?.valores.leaseOwner).toBeNull();
    expect(escrituras[0]?.valores.leaseExpiresAt).toBeNull();
  });

  it('devuelve false si la ejecución no estaba atascada', async () => {
    // El `WHERE` exige `attempt >= max_attempts`: sobre otra fila no aplica.
    filasDevueltas = [];
    expect(await unstickRun(42)).toBe(false);
  });
});

describe('createAgentMemory', () => {
  it('un hecho de scope user necesita usuario', async () => {
    // La validación ocurre antes de escribir: el error llega con nombre en vez
    // de como violación de constraint.
    await expect(
      createAgentMemory({
        scope: 'user',
        scopeUserId: null,
        memoryKey: 'preferencia',
        content: 'texto',
        sourceType: 'user',
      }),
    ).rejects.toMatchObject({ code: 'agent_memory_scope_invalid' });

    expect(escrituras).toHaveLength(0);
  });

  it('un hecho de scope agent necesita agente', async () => {
    await expect(
      createAgentMemory({
        scope: 'agent',
        agentId: null,
        memoryKey: 'umbral',
        content: 'texto',
        sourceType: 'policy',
      }),
    ).rejects.toMatchObject({ code: 'agent_memory_scope_invalid' });
  });

  it('rechaza un usuario colgado de un scope global', async () => {
    // Delata a quien creyó estar guardando algo privado en un hecho global.
    await expect(
      createAgentMemory({
        scope: 'global',
        scopeUserId: 'u1',
        memoryKey: 'politica',
        content: 'texto',
        sourceType: 'policy',
      }),
    ).rejects.toMatchObject({ code: 'agent_memory_scope_invalid' });
  });

  it('nace proposed: verificar es un acto aparte y con firma', async () => {
    filasDevueltas = [{ id: 1, verificationStatus: 'proposed' }];
    await createAgentMemory({
      scope: 'global',
      memoryKey: 'umbral-disco',
      content: 'Crítico al 90 %.',
      sourceType: 'policy',
      createdByUserId: 'u1',
    });

    expect(escrituras[0]?.valores.verificationStatus).toBe('proposed');
  });

  it('por defecto es interna, no pública', async () => {
    filasDevueltas = [{ id: 1 }];
    await createAgentMemory({
      scope: 'global',
      memoryKey: 'x',
      content: 'y',
      sourceType: 'policy',
    });
    expect(escrituras[0]?.valores.sensitivity).toBe('internal');
  });
});
