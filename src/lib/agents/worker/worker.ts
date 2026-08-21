import 'server-only';

import { eq } from 'drizzle-orm';

import { agentDefinitions } from '@/db/schema';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logRedacted } from '@/lib/log';
import { upsertWorkerHeartbeat } from '@/lib/queries/agents/workers';

import { areAgentsEnabled, getAgentRuntimeLimits } from '../runtime-flags';
import { claimNextAgentRun, recoverExpiredLeases } from './claim';
import { processPendingEvents } from './event-processor';
import { executeAgentRun } from './execute-run';
import { finishAgentRun } from './finish-run';
import { releaseLease, startHeartbeat } from './lease';
import { runSchedulerTick } from './scheduler';
import { createShutdownController, type ShutdownController } from './shutdown';
import type { AgentRun } from '@/types';

/**
 * El bucle del worker.
 *
 * Cada vuelta hace cuatro cosas y luego duerme: recuperar leases vencidos,
 * materializar rutinas, procesar eventos y ejecutar una unidad de trabajo. Ese
 * orden importa —recuperar antes de reclamar evita que el worker coja trabajo
 * nuevo mientras hay trabajo abandonado esperando— pero ninguna de las cuatro
 * es crítica: si una falla, se registra y la vuelta sigue.
 *
 * El kill switch se consulta **en cada vuelta**. Apagarlo detiene el sistema en
 * menos de un ciclo de sondeo, sin desplegar ni reiniciar nada.
 */

export type WorkerOptions = {
  readonly workerId: string;
  readonly version?: string;
  readonly hostname?: string;
  /** Una sola vuelta y salir. Lo usan `--once` y los tests. */
  readonly once?: boolean;
  /** Solo el tick de rutinas, sin ejecutar nada. */
  readonly schedulesOnly?: boolean;
  readonly pollMs?: number;
  readonly shutdown?: ShutdownController;
};

export type WorkerTickResult = {
  readonly recoveredLeases: number;
  readonly schedulerRuns: number;
  readonly eventsProcessed: number;
  readonly runExecuted: number | null;
  readonly agentsEnabled: boolean;
};

/**
 * Prompt del sistema en esta fase.
 *
 * Deliberadamente escueto: ningún agente tiene todavía prompt propio —eso llega
 * con Guardian en PR 6— y un prompt genérico que prometa capacidades que no
 * existen solo produce alucinaciones sobre lo que el agente puede hacer.
 */
function systemPromptFor(slug: string, mode: string): string {
  return [
    `Eres un agente interno de SocialPro (${slug}), operando en modo ${mode}.`,
    'Responde solo con lo que puedas comprobar con las herramientas disponibles.',
    'Si no tienes datos, dilo; no los supongas.',
    mode === 'shadow'
      ? 'Estás en modo shadow: analizas y propones, pero ninguna acción con efecto se ejecuta.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Una vuelta completa. */
export async function runWorkerTick(opts: WorkerOptions): Promise<WorkerTickResult> {
  const habilitado = areAgentsEnabled();

  if (!habilitado) {
    // Ni siquiera se recuperan leases: con el sistema apagado, lo correcto es
    // no tocar nada y dejar la cola tal como está.
    return {
      recoveredLeases: 0,
      schedulerRuns: 0,
      eventsProcessed: 0,
      runExecuted: null,
      agentsEnabled: false,
    };
  }

  let leasesRecuperados = 0;
  let rutinasCreadas = 0;
  let eventosProcesados = 0;

  try {
    leasesRecuperados = await recoverExpiredLeases();
  } catch (err) {
    logRedacted('warn', '[agents] fallo recuperando leases:', err);
  }

  try {
    const tick = await runSchedulerTick();
    rutinasCreadas = tick.runsCreated;
  } catch (err) {
    logRedacted('warn', '[agents] fallo en el tick de rutinas:', err);
  }

  try {
    const eventos = await processPendingEvents({ workerId: opts.workerId });
    eventosProcesados = eventos.claimed;
  } catch (err) {
    logRedacted('warn', '[agents] fallo procesando eventos:', err);
  }

  if (opts.schedulesOnly) {
    return {
      recoveredLeases: leasesRecuperados,
      schedulerRuns: rutinasCreadas,
      eventsProcessed: eventosProcesados,
      runExecuted: null,
      agentsEnabled: true,
    };
  }

  const ejecutado = await claimAndExecuteOne(opts);

  return {
    recoveredLeases: leasesRecuperados,
    schedulerRuns: rutinasCreadas,
    eventsProcessed: eventosProcesados,
    runExecuted: ejecutado,
    agentsEnabled: true,
  };
}

/** Reclama una ejecución y la lleva hasta el final. `null` si no había ninguna. */
export async function claimAndExecuteOne(opts: WorkerOptions): Promise<number | null> {
  const limites = getAgentRuntimeLimits();

  let run: AgentRun | null = null;
  try {
    run = await claimNextAgentRun({ workerId: opts.workerId, leaseSeconds: limites.leaseSeconds });
  } catch (err) {
    logRedacted('warn', '[agents] fallo reclamando trabajo:', err);
    return null;
  }
  if (!run) return null;

  opts.shutdown?.markBusy();

  const [agente] = await db
    .select()
    .from(agentDefinitions)
    .where(eq(agentDefinitions.id, run.agentId))
    .limit(1);

  if (!agente) {
    // No debería poder pasar: la FK es `restrict`. Si pasa, se suelta el lease
    // en vez de dejar la ejecución colgada.
    await releaseLease(run.id, opts.workerId);
    opts.shutdown?.markIdle();
    return null;
  }

  // Un agente pausado o apagado entre el encolado y ahora: se devuelve a la
  // cola en vez de ejecutarse. El kill switch por agente vale también para el
  // trabajo ya encolado.
  if (agente.status !== 'active') {
    await releaseLease(run.id, opts.workerId);
    opts.shutdown?.markIdle();
    return null;
  }

  let leasePerdido = false;
  const heartbeat = startHeartbeat({
    runId: run.id,
    workerId: opts.workerId,
    leaseSeconds: limites.leaseSeconds,
    onLost: () => {
      leasePerdido = true;
    },
  });

  await upsertWorkerHeartbeat({
    workerId: opts.workerId,
    version: opts.version ?? 'unknown',
    hostname: opts.hostname ?? 'unknown',
    status: 'healthy',
    currentRunId: run.id,
  });

  try {
    const outcome = await executeAgentRun({
      run,
      agent: agente,
      workerId: opts.workerId,
      agentsEnabled: true,
      systemPrompt: systemPromptFor(agente.slug, agente.mode),
      userMessage: mensajeInicial(run),
      signal: opts.shutdown?.state.signal ?? new AbortController().signal,
    });

    if (leasePerdido) {
      // Perdimos el lease a mitad: otro worker ya es dueño de la ejecución y
      // escribir su desenlace sería pisarlo. `finishAgentRun` lo comprobaría
      // igualmente, pero decirlo aquí evita el viaje.
      logRedacted('warn', `[agents] lease perdido durante la ejecución ${run.id}`);
      return run.id;
    }

    await finishAgentRun({ run, workerId: opts.workerId, outcome });
    return run.id;
  } catch (err) {
    logRedacted('error', `[agents] ejecución ${run.id} lanzó una excepción:`, err);
    await finishAgentRun({
      run,
      workerId: opts.workerId,
      outcome: {
        status: 'failed',
        code: 'worker_exception',
        message: err instanceof Error ? err.message : 'error desconocido',
        turns: 0,
      },
    });
    return run.id;
  } finally {
    heartbeat.stop();
    opts.shutdown?.markIdle();
    await upsertWorkerHeartbeat({
      workerId: opts.workerId,
      version: opts.version ?? 'unknown',
      hostname: opts.hostname ?? 'unknown',
      status: 'healthy',
      currentRunId: null,
    });
  }
}

/**
 * Mensaje con el que arranca la conversación.
 *
 * Sale del input del run, que ya viene redactado por quien encoló. En PR 6 cada
 * agente construirá el suyo con sus reglas deterministas ya evaluadas.
 */
function mensajeInicial(run: AgentRun): string {
  const input = run.inputJson;
  if (typeof input.message === 'string') return input.message;
  return `Ejecución ${run.triggerType} del agente. Datos de entrada: ${JSON.stringify(input).slice(0, 2_000)}`;
}

/** Bucle continuo hasta que llegue una señal de apagado. */
export async function runWorkerLoop(opts: WorkerOptions): Promise<void> {
  const shutdown = opts.shutdown ?? createShutdownController();
  const pollMs = opts.pollMs ?? env.AGENT_WORKER_POLL_MS;

  await upsertWorkerHeartbeat({
    workerId: opts.workerId,
    version: opts.version ?? 'unknown',
    hostname: opts.hostname ?? 'unknown',
    status: 'starting',
  });

  logRedacted('info', `[agents] worker ${opts.workerId} arrancado (poll ${pollMs} ms)`);

  while (!shutdown.isDraining()) {
    const resultado = await runWorkerTick({ ...opts, shutdown });

    if (opts.once) break;

    // Sin trabajo, se espera el intervalo completo. Con trabajo, se vuelve a
    // mirar enseguida: una cola con cien ejecuciones no debe drenarse a razón
    // de una cada dos segundos.
    const espera = resultado.runExecuted === null ? pollMs : 50;
    await new Promise((r) => setTimeout(r, espera));
  }

  await upsertWorkerHeartbeat({
    workerId: opts.workerId,
    version: opts.version ?? 'unknown',
    hostname: opts.hostname ?? 'unknown',
    status: 'draining',
  });

  // El plazo antes del SIGKILL suele ser de 10 s. Ocho deja margen para
  // escribir el último heartbeat.
  const drenado = await shutdown.waitForDrain(8_000);
  if (!drenado) {
    logRedacted('warn', '[agents] apagando con trabajo aún en curso; su lease vencerá y otro worker lo recogerá');
  }

  await upsertWorkerHeartbeat({
    workerId: opts.workerId,
    version: opts.version ?? 'unknown',
    hostname: opts.hostname ?? 'unknown',
    status: 'stopped',
  });

  shutdown.dispose();
  logRedacted('info', `[agents] worker ${opts.workerId} detenido (${shutdown.reason() ?? 'fin'})`);
}
