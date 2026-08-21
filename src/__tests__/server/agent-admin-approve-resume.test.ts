/**
 * Aprobar reencola; rechazar termina.
 *
 * Este es el hueco que cerró PR 4. Antes, `decideApproval` solo tocaba
 * `agent_approvals`: la ejecución seguía en `waiting_approval` y el claim del
 * worker solo mira `queued`/`retry_scheduled`, así que **aprobar no hacía
 * nada**. El humano firmaba y la ejecución se quedaba parada para siempre.
 *
 * Y el segundo: cada paso por aprobación gastaba un reintento, porque el claim
 * hace `attempt + 1` siempre. Tres firmas agotaban los tres intentos sin que
 * hubiera fallado nada.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/auth', () => ({ auth: {} }));

/** Registro de lo que se le pidió a la base, para poder inspeccionarlo. */
type Escritura = { readonly tabla: string; readonly valores: Record<string, unknown> };
let escrituras: Escritura[] = [];
let aprobacionDevuelta: Record<string, unknown> | null = null;
let estadoActual: string | null = null;

function fakeTx() {
  return {
    update: (tabla: unknown) => {
      const nombre = nombreDeTabla(tabla);
      return {
        set: (valores: Record<string, unknown>) => {
          // El update de `agent_runs` no lleva `.returning()`, así que la
          // escritura se anota al construir el `where` y no al resolverlo. Con
          // `then` el objeto es además awaitable, como el de Drizzle.
          const anotar = (): void => {
            escrituras.push({ tabla: nombre, valores });
          };
          return {
            where: () => {
              anotar();
              return {
                returning: async () =>
                  nombre === 'agent_approvals'
                    ? aprobacionDevuelta
                      ? [aprobacionDevuelta]
                      : []
                    : [{ id: 1 }],
                then: (resolve: (v: unknown) => unknown) => resolve([{ id: 1 }]),
              };
            },
          };
        },
      };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (estadoActual ? [{ status: estadoActual }] : []),
        }),
      }),
    }),
  };
}

/** Drizzle guarda el nombre en un símbolo; basta con buscarlo en el objeto. */
function nombreDeTabla(tabla: unknown): string {
  const texto = JSON.stringify(Object.getOwnPropertySymbols(tabla as object).map((s) => String(s)));
  if (texto.includes('agent_approvals')) return 'agent_approvals';
  if (texto.includes('agent_runs')) return 'agent_runs';
  for (const s of Object.getOwnPropertySymbols(tabla as object)) {
    const v = (tabla as Record<symbol, unknown>)[s];
    if (typeof v === 'string' && v.startsWith('agent_')) return v;
  }
  return 'desconocida';
}

jest.mock('@/lib/db', () => ({
  db: {},
  getTransactionalDb: () => ({
    transaction: async (fn: (tx: ReturnType<typeof fakeTx>) => Promise<unknown>) => fn(fakeTx()),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: 1 }] }) }) }),
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
  }),
}));

import { decideApprovalAndResumeRun } from '@/lib/queries/agents/resume';

const APROBACION = {
  id: 7,
  runId: 42,
  actionHash: 'a'.repeat(64),
  actionClass: 'external_side_effect',
  status: 'approved',
};

beforeEach(() => {
  escrituras = [];
  aprobacionDevuelta = { ...APROBACION };
  estadoActual = null;
});

describe('aprobar', () => {
  it('devuelve la ejecución a la cola', async () => {
    // Sin esto, aprobar no hace nada: el claim solo mira `queued` y
    // `retry_scheduled`.
    const res = await decideApprovalAndResumeRun({
      approvalId: 7,
      decision: 'approved',
      decidedByUserId: 'u1',
    });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.runStatus).toBe('queued');

    const run = escrituras.find((e) => e.tabla === 'agent_runs');
    expect(run?.valores.status).toBe('queued');
  });

  it('NO consume un reintento', async () => {
    // El claim hace `attempt + 1` siempre. Sin compensarlo, tres firmas agotan
    // los tres intentos sin que haya fallado nada, y la ejecución acaba en
    // `queued` con los intentos gastados: un huérfano que nadie recoge.
    await decideApprovalAndResumeRun({ approvalId: 7, decision: 'approved', decidedByUserId: 'u1' });

    const run = escrituras.find((e) => e.tabla === 'agent_runs');
    expect(run?.valores.attempt).toBeDefined();

    // `attempt` es un fragmento SQL de Drizzle y no se puede serializar —sus
    // columnas apuntan a la tabla y la tabla a las columnas—, así que se
    // recogen sus trozos literales para comprobar que compensa el incremento.
    const trozos: string[] = [];
    const recoger = (v: unknown, prof: number): void => {
      if (prof > 5 || v === null || typeof v !== 'object') return;
      if ('value' in v) {
        const valor = (v as { value: unknown }).value;
        if (typeof valor === 'string') trozos.push(valor);
        else if (Array.isArray(valor)) trozos.push(...valor.filter((x): x is string => typeof x === 'string'));
      }
      if ('queryChunks' in v && Array.isArray((v as { queryChunks: unknown[] }).queryChunks)) {
        for (const c of (v as { queryChunks: unknown[] }).queryChunks) recoger(c, prof + 1);
      }
    };
    recoger(run?.valores.attempt, 0);
    expect(trozos.join(' ')).toMatch(/greatest/i);
  });

  it('suelta el lease al reencolar', async () => {
    await decideApprovalAndResumeRun({ approvalId: 7, decision: 'approved', decidedByUserId: 'u1' });

    const run = escrituras.find((e) => e.tabla === 'agent_runs');
    expect(run?.valores.leaseOwner).toBeNull();
    expect(run?.valores.leaseExpiresAt).toBeNull();
  });

  it('escribe la decisión con su firmante', async () => {
    await decideApprovalAndResumeRun({
      approvalId: 7,
      decision: 'approved',
      decidedByUserId: 'u1',
      note: 'revisado',
    });

    const aprobacion = escrituras.find((e) => e.tabla === 'agent_approvals');
    expect(aprobacion?.valores.status).toBe('approved');
    expect(aprobacion?.valores.decidedByUserId).toBe('u1');
    expect(aprobacion?.valores.decisionNote).toBe('revisado');
    expect(aprobacion?.valores.decidedAt).toBeInstanceOf(Date);
  });
});

describe('rechazar', () => {
  it('termina la ejecución en vez de dejarla parada', async () => {
    const res = await decideApprovalAndResumeRun({
      approvalId: 7,
      decision: 'rejected',
      decidedByUserId: 'u1',
    });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.runStatus).toBe('cancelled');

    const run = escrituras.find((e) => e.tabla === 'agent_runs');
    expect(run?.valores.status).toBe('cancelled');
  });

  it('escribe completed_at en el MISMO update que el estado', async () => {
    // `agent_runs_terminal_completed_ck` no admite un estado terminal sin
    // fecha ni por un instante: en dos pasadas reventaría la constraint.
    await decideApprovalAndResumeRun({ approvalId: 7, decision: 'rejected', decidedByUserId: 'u1' });

    const run = escrituras.find((e) => e.tabla === 'agent_runs');
    expect(run?.valores.status).toBe('cancelled');
    expect(run?.valores.completedAt).toBeInstanceOf(Date);
  });

  it('deja dicho por qué se canceló', async () => {
    await decideApprovalAndResumeRun({ approvalId: 7, decision: 'rejected', decidedByUserId: 'u1' });

    const run = escrituras.find((e) => e.tabla === 'agent_runs');
    expect(run?.valores.lastErrorCode).toBe('approval_rejected');
  });
});

describe('decisiones que no se aplican', () => {
  it('una aprobación ya decidida no se vuelve a decidir', async () => {
    aprobacionDevuelta = null;
    estadoActual = 'approved';

    const res = await decideApprovalAndResumeRun({
      approvalId: 7,
      decision: 'approved',
      decidedByUserId: 'u2',
    });

    expect(res).toEqual({ ok: false, code: 'approval_already_decided' });
    // Y no se toca la ejecución.
    expect(escrituras.filter((e) => e.tabla === 'agent_runs')).toHaveLength(0);
  });

  it('una pendiente vencida no se rescata firmándola tarde', async () => {
    aprobacionDevuelta = null;
    estadoActual = 'pending';

    const res = await decideApprovalAndResumeRun({
      approvalId: 7,
      decision: 'approved',
      decidedByUserId: 'u1',
    });

    expect(res).toEqual({ ok: false, code: 'approval_expired' });
    expect(escrituras.filter((e) => e.tabla === 'agent_runs')).toHaveLength(0);
  });

  it('una aprobación inexistente no mueve nada', async () => {
    aprobacionDevuelta = null;
    estadoActual = null;

    const res = await decideApprovalAndResumeRun({
      approvalId: 999,
      decision: 'approved',
      decidedByUserId: 'u1',
    });

    expect(res.ok).toBe(false);
    expect(escrituras.filter((e) => e.tabla === 'agent_runs')).toHaveLength(0);
  });
});
