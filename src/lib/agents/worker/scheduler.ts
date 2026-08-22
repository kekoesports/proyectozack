import 'server-only';

import { and, eq, lte, sql } from 'drizzle-orm';

import { agentDefinitions, agentSchedules } from '@/db/schema';
import { buildScheduleIdempotencyKey } from '../keys';
import { db, getTransactionalDb } from '@/lib/db';
import { enqueueAgentRun } from '@/lib/queries/agents/runs';
import { logRedacted } from '@/lib/log';
import type { AgentSchedule } from '@/types';

import { extraerFilas } from './claim';
import { missedOccurrences, nextCronOccurrence } from './cron';

/**
 * Materializa rutinas vencidas en ejecuciones.
 *
 * Dos mecanismos independientes impiden los duplicados, y hacen falta los dos:
 *
 * 1. **Advisory lock global.** Solo un worker corre el tick a la vez. Sin él,
 *    dos workers leerían la misma rutina vencida en el mismo segundo.
 * 2. **Clave de idempotencia por ventana.** `schedule:<slug>:<ISO>`, con el
 *    UNIQUE de `agent_runs` detrás. El lock puede fallar —un worker que muere
 *    con el lock tomado, un reinicio a mitad de tick— y entonces la clave es lo
 *    único que queda.
 *
 * El primero evita el trabajo repetido; el segundo evita el daño. No son
 * redundantes: protegen de cosas distintas.
 */

/** Identificador del advisory lock. Constante arbitraria, pero fija. */
export const SCHEDULER_LOCK_ID = 8_421_071;

export type SchedulerTickResult = {
  readonly claimedLock: boolean;
  readonly schedulesChecked: number;
  readonly runsCreated: number;
  readonly runsDeduplicated: number;
  readonly windowsSkipped: number;
};

/**
 * Toma el advisory lock si está libre.
 *
 * `pg_try_advisory_lock` no espera: si otro worker lo tiene, este tick se salta
 * y el siguiente lo intentará. Esperar solo serviría para acumular workers
 * bloqueados haciendo el mismo trabajo con un minuto de retraso.
 */
async function tryLock(): Promise<boolean> {
  const resultado = await db.execute(sql`SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_ID}) AS locked`);
  const filas = extraerFilas<{ locked: boolean }>(resultado);
  return filas[0]?.locked === true;
}

async function unlock(): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_ID})`);
}

/**
 * Ventanas que hay que materializar para una rutina.
 *
 * `catchUpPolicy` decide qué hacer con lo perdido tras una parada:
 *
 * - `skip`: nada de lo pasado; solo se reprograma hacia delante.
 * - `latest`: solo la última ventana perdida.
 * - `all_limited`: hasta `maxCatchUpRuns`.
 *
 * Ninguna recupera "todo": un worker que vuelve tras una semana caído
 * materializaría cientos de ejecuciones y se comería el presupuesto del mes en
 * minutos.
 */
export function windowsToMaterialize(
  schedule: Pick<AgentSchedule, 'cronExpression' | 'timezone' | 'catchUpPolicy' | 'maxCatchUpRuns' | 'nextRunAt' | 'lastScheduledFor'>,
  ahora: Date,
): readonly Date[] {
  const desde = schedule.lastScheduledFor ?? schedule.nextRunAt;
  if (!desde) return [];

  switch (schedule.catchUpPolicy) {
    case 'skip': {
      // Solo la ventana actual si sigue vencida; lo anterior se abandona.
      return schedule.nextRunAt && schedule.nextRunAt <= ahora ? [schedule.nextRunAt] : [];
    }
    case 'latest': {
      const perdidas = missedOccurrences(
        schedule.cronExpression,
        desde,
        ahora,
        schedule.maxCatchUpRuns + 10,
        schedule.timezone,
      );
      const ultima = perdidas[perdidas.length - 1] ?? (schedule.nextRunAt && schedule.nextRunAt <= ahora ? schedule.nextRunAt : null);
      return ultima ? [ultima] : [];
    }
    case 'all_limited': {
      const perdidas = missedOccurrences(
        schedule.cronExpression,
        desde,
        ahora,
        schedule.maxCatchUpRuns,
        schedule.timezone,
      );
      if (perdidas.length > 0) return perdidas;
      return schedule.nextRunAt && schedule.nextRunAt <= ahora ? [schedule.nextRunAt] : [];
    }
  }
}

/**
 * Un tick del scheduler.
 *
 * No hace nada si no consigue el lock, y eso no es un error: significa que otro
 * worker está en ello.
 */
export async function runSchedulerTick(ahora: Date = new Date()): Promise<SchedulerTickResult> {
  const vacio: SchedulerTickResult = {
    claimedLock: false,
    schedulesChecked: 0,
    runsCreated: 0,
    runsDeduplicated: 0,
    windowsSkipped: 0,
  };

  if (!(await tryLock())) return vacio;

  let creadas = 0;
  let deduplicadas = 0;
  let saltadas = 0;
  let revisadas = 0;

  try {
    const vencidas = await db
      .select({
        schedule: agentSchedules,
        agentSlug: agentDefinitions.slug,
        agentStatus: agentDefinitions.status,
      })
      .from(agentSchedules)
      .innerJoin(agentDefinitions, eq(agentSchedules.agentId, agentDefinitions.id))
      .where(and(eq(agentSchedules.enabled, true), lte(agentSchedules.nextRunAt, ahora)))
      .limit(50);

    for (const { schedule, agentSlug, agentStatus } of vencidas) {
      revisadas += 1;

      // Un agente apagado no acumula cola: la ventana se descarta y la rutina
      // se reprograma. Encolarlas para "cuando se encienda" dispararía todas de
      // golpe al activarlo.
      if (agentStatus !== 'active') {
        saltadas += 1;
        await reprogramar(schedule, ahora);
        continue;
      }

      const ventanas = windowsToMaterialize(schedule, ahora);

      for (const ventana of ventanas) {
        try {
          const resultado = await enqueueAgentRun({
            agentSlug,
            triggerType: 'schedule',
            correlationId: `schedule-${schedule.slug}-${ventana.toISOString()}`,
            idempotencyKey: buildScheduleIdempotencyKey(schedule.slug, ventana),
            scheduledFor: ventana,
            inputJson: { scheduleSlug: schedule.slug, ...schedule.inputJson },
          });

          if (resultado.deduplicated) deduplicadas += 1;
          else creadas += 1;

          await marcarTick(schedule, ventana, resultado.run.id, ahora);
        } catch (err) {
          // Que una rutina falle no debe detener las demás.
          logRedacted('warn', `[agents] no se pudo materializar '${schedule.slug}':`, err);
          saltadas += 1;
        }
      }

      if (ventanas.length === 0) await reprogramar(schedule, ahora);
    }
  } finally {
    // El lock se suelta pase lo que pase: retenerlo tras un fallo dejaría el
    // scheduler mudo hasta que alguien reiniciara el proceso.
    await unlock();
  }

  return {
    claimedLock: true,
    schedulesChecked: revisadas,
    runsCreated: creadas,
    runsDeduplicated: deduplicadas,
    windowsSkipped: saltadas,
  };
}

async function marcarTick(
  schedule: AgentSchedule,
  ventana: Date,
  runId: number,
  ahora: Date,
): Promise<void> {
  const siguiente = nextCronOccurrence(schedule.cronExpression, ahora, schedule.timezone);
  await db
    .update(agentSchedules)
    .set({
      lastScheduledFor: ventana,
      lastRunId: runId,
      // Sin próxima ventana, la rutina se desactiva: dejarla activa sin fecha
      // viola `agent_schedules_enabled_next_ck` y además no volvería a correr.
      nextRunAt: siguiente,
      enabled: siguiente !== null,
      updatedAt: ahora,
    })
    .where(eq(agentSchedules.id, schedule.id));
}

async function reprogramar(schedule: AgentSchedule, ahora: Date): Promise<void> {
  const siguiente = nextCronOccurrence(schedule.cronExpression, ahora, schedule.timezone);
  await db
    .update(agentSchedules)
    .set({ nextRunAt: siguiente, enabled: siguiente !== null, updatedAt: ahora })
    .where(eq(agentSchedules.id, schedule.id));
}

/**
 * Deja lista una rutina recién activada.
 *
 * Se separa de `setAgentScheduleEnabled` porque calcular la próxima ventana
 * necesita el parser de cron, que vive en el worker.
 */
export async function activateSchedule(scheduleId: number, ahora: Date = new Date()): Promise<Date | null> {
  const transaccional = getTransactionalDb();
  const [schedule] = await transaccional
    .select()
    .from(agentSchedules)
    .where(eq(agentSchedules.id, scheduleId))
    .limit(1);

  if (!schedule) throw new Error(`agents: no existe la rutina ${scheduleId}`);

  const siguiente = nextCronOccurrence(schedule.cronExpression, ahora, schedule.timezone);
  if (!siguiente) throw new Error(`agents: '${schedule.cronExpression}' no tiene próxima ejecución`);

  await transaccional
    .update(agentSchedules)
    .set({ enabled: true, nextRunAt: siguiente, updatedAt: ahora })
    .where(eq(agentSchedules.id, scheduleId));

  return siguiente;
}
