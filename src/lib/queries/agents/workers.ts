import 'server-only';

import { desc, eq, gte } from 'drizzle-orm';

import { agentWorkerHeartbeats } from '@/db/schema';
import { db } from '@/lib/db';
import type { AgentWorkerHeartbeat } from '@/types';

/**
 * Salud del execution plane.
 *
 * Sin esto, "¿está vivo el worker?" solo se contesta mirando logs de
 * contenedor. Con esto lo contesta una consulta, y la pantalla de PR 4 lo
 * enseña sin acceso al VPS.
 *
 * Ver docs/agent-os/data-model.md §12.
 */

export type WorkerHeartbeatInput = {
  readonly workerId: string;
  readonly version?: string;
  readonly hostname?: string;
  readonly status?: AgentWorkerHeartbeat['status'];
  readonly currentRunId?: number | null;
  /** Metadatos operativos. Sin secretos ni IPs públicas. */
  readonly metadataJson?: Record<string, unknown>;
};

export async function upsertWorkerHeartbeat(input: WorkerHeartbeatInput): Promise<void> {
  const now = new Date();
  await db
    .insert(agentWorkerHeartbeats)
    .values({
      workerId: input.workerId,
      version: input.version ?? 'unknown',
      hostname: input.hostname ?? 'unknown',
      status: input.status ?? 'starting',
      currentRunId: input.currentRunId ?? null,
      metadataJson: input.metadataJson ?? {},
      lastHeartbeatAt: now,
    })
    .onConflictDoUpdate({
      target: agentWorkerHeartbeats.workerId,
      set: {
        version: input.version ?? 'unknown',
        hostname: input.hostname ?? 'unknown',
        status: input.status ?? 'healthy',
        currentRunId: input.currentRunId ?? null,
        metadataJson: input.metadataJson ?? {},
        lastHeartbeatAt: now,
      },
    });
}

/**
 * Renueva la presencia del worker sin tocar `currentRunId`.
 *
 * El latido periódico también corre mientras hay una ejecución larga. Usar el
 * upsert general aquí borraría el run activo al poner `currentRunId` a null;
 * este UPDATE deliberadamente conserva ese campo y los metadatos existentes.
 */
export async function touchWorkerHeartbeat(
  input: Pick<WorkerHeartbeatInput, 'workerId' | 'version' | 'hostname'>,
): Promise<void> {
  await db
    .update(agentWorkerHeartbeats)
    .set({
      version: input.version ?? 'unknown',
      hostname: input.hostname ?? 'unknown',
      status: 'healthy',
      lastHeartbeatAt: new Date(),
    })
    .where(eq(agentWorkerHeartbeats.workerId, input.workerId));
}

export async function listWorkerHeartbeats(limit = 20): Promise<readonly AgentWorkerHeartbeat[]> {
  return db
    .select()
    .from(agentWorkerHeartbeats)
    .orderBy(desc(agentWorkerHeartbeats.lastHeartbeatAt))
    .limit(Math.min(limit, 100));
}

/**
 * Workers vistos dentro de la ventana. Los que quedan fuera no se borran: un
 * histórico corto de arranques y paradas es lo que delata un contenedor que se
 * reinicia en bucle.
 */
export async function listLiveWorkers(
  withinSeconds = 120,
): Promise<readonly AgentWorkerHeartbeat[]> {
  const cutoff = new Date(Date.now() - withinSeconds * 1000);
  return db
    .select()
    .from(agentWorkerHeartbeats)
    .where(gte(agentWorkerHeartbeats.lastHeartbeatAt, cutoff))
    .orderBy(desc(agentWorkerHeartbeats.lastHeartbeatAt));
}
