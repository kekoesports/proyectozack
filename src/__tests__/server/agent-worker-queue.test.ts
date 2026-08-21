/**
 * Cola: claim, leases y política de reintentos.
 *
 * **Qué se prueba aquí y qué no.** En CI no hay Postgres, así que las garantías
 * de concurrencia reales —dos workers reclamando filas distintas, un lease que
 * vence y se recupera— no se pueden ejercitar: eso exige una base y está
 * declarado como no verificado en el PR. Lo que sí se comprueba es que la
 * sentencia que las produce dice lo que tiene que decir, y que toda la lógica
 * que rodea al claim se comporta como debe.
 *
 * No es lo mismo, y por eso se dice.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/auth', () => ({ auth: {} }));

const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockExecute = jest.fn();
jest.mock('@/lib/db', () => ({
  db: { update: mockUpdate, select: mockSelect, execute: mockExecute },
  getTransactionalDb: () => ({ update: mockUpdate, select: mockSelect, execute: mockExecute }),
}));

import { buildClaimSql, extraerFilas } from '@/lib/agents/worker/claim';
import {
  FRACCION_HEARTBEAT,
  heartbeatIntervalMs,
  isRunStillOurs,
  startHeartbeat,
} from '@/lib/agents/worker/lease';
import { decideRetry, statusForDecision } from '@/lib/agents/worker/retry-policy';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

/**
 * El SQL como texto, para poder hacer aserciones legibles sobre la sentencia.
 *
 * No se puede serializar el objeto de Drizzle —sus columnas apuntan a la tabla
 * y la tabla a las columnas—, así que se recorren los trozos y se recogen los
 * literales y los nombres de columna.
 */
function sqlComoTexto(): string {
  const consulta = buildClaimSql({ workerId: 'w1', leaseSeconds: 60 });
  const trozos: string[] = [];

  const recoger = (valor: unknown, profundidad: number): void => {
    if (profundidad > 6 || valor === null || typeof valor !== 'object') return;

    if ('value' in valor) {
      const v = (valor as { value: unknown }).value;
      if (typeof v === 'string') trozos.push(v);
      else if (Array.isArray(v)) trozos.push(...v.filter((x): x is string => typeof x === 'string'));
    }
    if ('name' in valor && typeof (valor as { name: unknown }).name === 'string') {
      trozos.push((valor as { name: string }).name);
    }
    if ('queryChunks' in valor && Array.isArray((valor as { queryChunks: unknown[] }).queryChunks)) {
      for (const c of (valor as { queryChunks: unknown[] }).queryChunks) recoger(c, profundidad + 1);
    }
  };

  recoger(consulta, 0);
  return trozos.join(' ').replace(/\s+/g, ' ');
}

describe('sentencia del claim', () => {
  const texto = sqlComoTexto();

  it('usa FOR UPDATE SKIP LOCKED', () => {
    // Sin SKIP LOCKED, dos workers se bloquean el uno al otro y el segundo no
    // aporta nada.
    expect(texto).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('solo reclama lo que está disponible', () => {
    expect(texto).toContain("'queued'");
    expect(texto).toContain("'retry_scheduled'");
    // `[\s\S]` en vez de la flag `/s`: el target de tsconfig.jest es anterior
    // a ES2018 y `dotAll` no está disponible.
    expect(texto).toMatch(/available_at[\s\S]{0,40}now\(\)/);
  });

  it('no reclama lo que ya tiene lease vivo', () => {
    expect(texto).toMatch(/lease_expires_at/);
  });

  it('no reclama una ejecución que alguien canceló', () => {
    expect(texto).toContain('cancel_requested_at');
  });

  it('respeta el tope de intentos', () => {
    // Sin esto, el intento que sobra revienta contra `agent_runs_attempt_ck` en
    // vez de dejar la fila lista para dead-letter.
    expect(texto).toMatch(/attempt[\s\S]{0,60}max_attempts/);
  });

  it('escribe estado, lease e intento en la MISMA sentencia', () => {
    // Los CHECK de la tabla no admiten el estado intermedio: `running` sin
    // lease no es una fila válida ni por un instante.
    expect(texto).toContain("'running'");
    expect(texto).toContain('lease_owner');
    expect(texto).toContain('lease_expires_at');
    expect(texto).toContain('attempt');
  });

  it('ordena por prioridad y antigüedad', () => {
    expect(texto).toMatch(/priority[\s\S]{0,80}available_at/);
  });

  it('reclama una sola fila por vuelta', () => {
    expect(texto).toContain('LIMIT');
  });
});

describe('extraerFilas', () => {
  it('funciona con el formato de neon-http (array suelto)', () => {
    expect(extraerFilas([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it('y con el de pg (objeto con .rows)', () => {
    // El worker tiene que funcionar con los dos: la migración al VPS cambia el
    // driver bajo los pies.
    expect(extraerFilas({ rows: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });

  it('devuelve vacío ante cualquier otra cosa', () => {
    expect(extraerFilas(null)).toEqual([]);
    expect(extraerFilas({ raro: true })).toEqual([]);
  });
});

describe('leases', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockUpdate.mockReset();
  });

  it('el heartbeat va muy por delante del vencimiento', () => {
    // Renovar justo antes de vencer no deja margen para un reintento.
    expect(heartbeatIntervalMs(60)).toBe(15_000);
    expect(FRACCION_HEARTBEAT).toBeLessThanOrEqual(0.5);
  });

  it('nunca renueva más rápido que cada 5 s, ni con leases cortos', () => {
    expect(heartbeatIntervalMs(15)).toBe(5_000);
  });

  function stubSelect(fila: unknown) {
    mockSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => (fila ? [fila] : []) }) }),
    });
  }

  it('la ejecución es nuestra si tenemos el lease y sigue viva', async () => {
    stubSelect({
      leaseOwner: 'w1',
      status: 'running',
      cancelRequestedAt: null,
      leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    expect(await isRunStillOurs(1, 'w1')).toBe(true);
  });

  it('deja de serlo si otro worker la reclamó', async () => {
    stubSelect({
      leaseOwner: 'w2',
      status: 'running',
      cancelRequestedAt: null,
      leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    expect(await isRunStillOurs(1, 'w1')).toBe(false);
  });

  it('deja de serlo si alguien pidió cancelar', async () => {
    stubSelect({
      leaseOwner: 'w1',
      status: 'running',
      cancelRequestedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    expect(await isRunStillOurs(1, 'w1')).toBe(false);
  });

  it('deja de serlo si el lease ya venció, aunque la fila siga a nuestro nombre', async () => {
    stubSelect({
      leaseOwner: 'w1',
      status: 'running',
      cancelRequestedAt: null,
      leaseExpiresAt: new Date(Date.now() - 1_000),
    });
    expect(await isRunStillOurs(1, 'w1')).toBe(false);
  });

  it('una fila que ya no existe no es nuestra', async () => {
    stubSelect(null);
    expect(await isRunStillOurs(1, 'w1')).toBe(false);
  });

  it('el heartbeat avisa en cuanto pierde el lease', async () => {
    let perdido = false;
    const hb = startHeartbeat({
      runId: 1,
      workerId: 'w1',
      leaseSeconds: 15,
      onLost: () => {
        perdido = true;
      },
      renew: async () => false,
    });

    await new Promise((r) => setTimeout(r, 5_100));
    hb.stop();
    expect(perdido).toBe(true);
  }, 10_000);

  it('un fallo al renovar se trata como pérdida', async () => {
    // No saber si conservamos el lease y seguir escribiendo es peor que parar:
    // esta es la interpretación que no duplica trabajo.
    let perdido = false;
    const hb = startHeartbeat({
      runId: 1,
      workerId: 'w1',
      leaseSeconds: 15,
      onLost: () => {
        perdido = true;
      },
      renew: async () => {
        throw new Error('red caída');
      },
    });

    await new Promise((r) => setTimeout(r, 5_100));
    hb.stop();
    expect(perdido).toBe(true);
  }, 10_000);
});

describe('política de reintentos', () => {
  it('reintenta lo transitorio con backoff', () => {
    const d = decideRetry({ errorCode: 'provider_quota', attempt: 1, maxAttempts: 3, now: AHORA, aleatorio: 0 });
    expect(d.kind).toBe('retry');
    if (d.kind === 'retry') {
      expect(d.delayMs).toBe(2_000);
      expect(d.availableAt.getTime()).toBe(AHORA.getTime() + 2_000);
    }
  });

  it('manda a dead-letter al agotar intentos', () => {
    const d = decideRetry({ errorCode: 'provider_quota', attempt: 3, maxAttempts: 3, now: AHORA });
    expect(d.kind).toBe('dead_letter');
  });

  it('no reintenta un fallo determinista', () => {
    const d = decideRetry({ errorCode: 'invalid_tool_input', attempt: 1, maxAttempts: 3, now: AHORA });
    expect(d.kind).toBe('fail');
  });

  it('lo indeterminado ni se reintenta ni se da por fallido', () => {
    // Es el único caso en que equivocarse tiene consecuencias irreversibles:
    // reintentar podría duplicar una acción que ya ocurrió.
    const d = decideRetry({ errorCode: 'tool_timeout_indeterminate', attempt: 1, maxAttempts: 3, now: AHORA });
    expect(d.kind).toBe('needs_review');
  });

  it('lo indeterminado se comprueba ANTES que los intentos restantes', () => {
    const d = decideRetry({ errorCode: 'tool_call_in_flight', attempt: 1, maxAttempts: 99, now: AHORA });
    expect(d.kind).toBe('needs_review');
  });

  it('cada decisión tiene su estado', () => {
    expect(statusForDecision({ kind: 'retry', delayMs: 1, availableAt: AHORA })).toBe('retry_scheduled');
    expect(statusForDecision({ kind: 'dead_letter', reason: 'x' })).toBe('dead_letter');
    expect(statusForDecision({ kind: 'fail', reason: 'x' })).toBe('failed');
    expect(statusForDecision({ kind: 'needs_review', reason: 'x' })).toBe('failed');
  });
});
