import 'server-only';

import { and, eq, sql } from 'drizzle-orm';

import { agentRuns } from '@/db/schema';
import { db } from '@/lib/db';

/**
 * Leases: quién es dueño de una ejecución y hasta cuándo.
 *
 * El lease es lo que hace recuperable a un worker muerto. Mientras trabaja lo
 * renueva; si el proceso desaparece, el lease vence y otro worker recoge la
 * ejecución sin perder los pasos ya escritos.
 *
 * La regla que gobierna el resto del worker: **perder el lease significa dejar
 * de escribir inmediatamente.** Un worker que sigue ejecutando tools con el
 * lease vencido puede estar duplicando el trabajo de otro que ya lo recogió.
 */

/** Cada cuánto renovar, en fracción de la duración del lease. */
export const FRACCION_HEARTBEAT = 0.25;

export function heartbeatIntervalMs(leaseSeconds: number): number {
  return Math.max(5_000, Math.floor(leaseSeconds * FRACCION_HEARTBEAT * 1_000));
}

/**
 * Renueva el lease.
 *
 * Devuelve `false` si la fila ya no es nuestra: otro worker la recogió, o la
 * ejecución dejó de estar `running`. Quien llama debe parar, no reintentar.
 */
export async function renewLease(
  runId: number,
  workerId: string,
  leaseSeconds: number,
): Promise<boolean> {
  const filas = await db
    .update(agentRuns)
    .set({
      leaseExpiresAt: sql`now() + make_interval(secs => ${leaseSeconds})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentRuns.id, runId),
        eq(agentRuns.leaseOwner, workerId),
        eq(agentRuns.status, 'running'),
      ),
    )
    .returning({ id: agentRuns.id });

  return filas.length > 0;
}

/**
 * ¿Seguimos siendo dueños y nadie pidió cancelar?
 *
 * Es lo que consulta el executor entre pasos. Una sola consulta responde a las
 * dos preguntas porque en la práctica tienen la misma consecuencia: parar.
 */
export async function isRunStillOurs(runId: number, workerId: string): Promise<boolean> {
  const [fila] = await db
    .select({
      leaseOwner: agentRuns.leaseOwner,
      status: agentRuns.status,
      cancelRequestedAt: agentRuns.cancelRequestedAt,
      leaseExpiresAt: agentRuns.leaseExpiresAt,
    })
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .limit(1);

  if (!fila) return false;
  if (fila.leaseOwner !== workerId) return false;
  if (fila.status !== 'running') return false;
  if (fila.cancelRequestedAt !== null) return false;
  if (fila.leaseExpiresAt && fila.leaseExpiresAt.getTime() <= Date.now()) return false;
  return true;
}

/**
 * Suelta el lease sin cerrar la ejecución.
 *
 * Lo usa el apagado ordenado: el worker devuelve a la cola lo que estaba
 * haciendo para que otro lo recoja sin esperar a que venza el lease.
 */
export async function releaseLease(runId: number, workerId: string): Promise<void> {
  await db
    .update(agentRuns)
    .set({ status: 'queued', leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date() })
    .where(
      and(eq(agentRuns.id, runId), eq(agentRuns.leaseOwner, workerId), eq(agentRuns.status, 'running')),
    );
}

/**
 * Mantiene vivo el lease mientras dura el trabajo.
 *
 * Si una renovación falla, invoca `onLost` y se detiene: a partir de ahí la
 * ejecución ya no es nuestra y seguir escribiendo sería pisar a otro worker.
 */
export function startHeartbeat(opts: {
  readonly runId: number;
  readonly workerId: string;
  readonly leaseSeconds: number;
  readonly onLost: () => void;
  readonly renew?: typeof renewLease;
}): { readonly stop: () => void } {
  const renovar = opts.renew ?? renewLease;
  const intervalo = setInterval(() => {
    void (async () => {
      try {
        const ok = await renovar(opts.runId, opts.workerId, opts.leaseSeconds);
        if (!ok) {
          clearInterval(intervalo);
          opts.onLost();
        }
      } catch {
        // Un fallo de red al renovar no significa que hayamos perdido el
        // lease, pero tampoco que lo conservemos. Se trata como pérdida: es la
        // interpretación que no duplica trabajo.
        clearInterval(intervalo);
        opts.onLost();
      }
    })();
  }, heartbeatIntervalMs(opts.leaseSeconds));

  // El temporizador no debe impedir que el proceso termine.
  if (typeof intervalo === 'object' && 'unref' in intervalo) intervalo.unref();

  return { stop: () => clearInterval(intervalo) };
}
