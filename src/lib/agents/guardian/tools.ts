import 'server-only';

import { and, desc, gte, sql } from 'drizzle-orm';

import { agentEvents, agentRuns, agentWorkerHeartbeats } from '@/db/schema';
import { db } from '@/lib/db';

import { defineReadTool } from '../tools/define';
import type { ErasedAgentTool } from '../types';
import { DEFAULT_THRESHOLDS, evaluateGuardianRules, type Finding } from './rules';

/**
 * Tools de Guardian. Todas de **lectura**.
 *
 * Guardian no reinicia servicios, no limpia disco y no aplica migraciones.
 * Durante shadow mode ni siquiera crea tareas ni envía notificaciones: mira,
 * correlaciona y escribe un informe. Las tools de escritura del catálogo
 * (§5 de agents-tools-policies) llegan cuando haya datos que digan que sus
 * hallazgos son fiables.
 *
 * Ninguna devuelve datos crudos del sistema: los eventos ya vienen validados y
 * redactados del ingestor, y aquí se resumen todavía más. Un volcado completo
 * en el contexto del modelo sería una fuga esperando a ocurrir.
 */

const VENTANA_HORAS_DEFECTO = 24;

function desdeHace(horas: number): Date {
  return new Date(Date.now() - horas * 60 * 60 * 1000);
}

/**
 * Señales del periodo, agregadas.
 *
 * Devuelve el recuento por tipo y severidad, no los eventos. Con doce lecturas
 * por hora, mandarlos todos llenaría el contexto de repeticiones y dejaría
 * fuera lo que importa.
 */
export const getSystemHealthSnapshotTool: ErasedAgentTool = defineReadTool({
  name: 'getSystemHealthSnapshot',
  description: 'Resumen de las señales de infraestructura de las últimas 24 h, agregadas por tipo y severidad.',
  permission: { module: 'infrastructure', action: 'read' },
  run: async () => {
    const filas = await db
      .select({
        eventType: agentEvents.eventType,
        severity: agentEvents.severity,
        total: sql<string>`count(*)`,
        ultimo: sql<Date>`max(${agentEvents.occurredAt})`,
      })
      .from(agentEvents)
      .where(gte(agentEvents.occurredAt, desdeHace(VENTANA_HORAS_DEFECTO)))
      .groupBy(agentEvents.eventType, agentEvents.severity)
      .orderBy(desc(sql`count(*)`))
      .limit(50);

    return {
      windowHours: VENTANA_HORAS_DEFECTO,
      buckets: filas.map((f) => ({
        eventType: f.eventType,
        severity: f.severity,
        count: Number(f.total),
        lastSeen: f.ultimo,
      })),
    };
  },
});

/**
 * Hallazgos ya calculados por las reglas.
 *
 * Es la tool central de Guardian y la que materializa la separación: el modelo
 * recibe **hechos**, no métricas para interpretar. Nunca se le pide que decida
 * si un 90 % de disco es preocupante.
 */
export const getOpenOperationalIncidentsTool: ErasedAgentTool = defineReadTool({
  name: 'getOpenOperationalIncidents',
  description:
    'Hallazgos detectados por las reglas deterministas sobre las señales recientes, con su severidad y evidencia.',
  permission: { module: 'infrastructure', action: 'read' },
  run: async () => {
    const eventos = await db
      .select()
      .from(agentEvents)
      .where(
        and(
          gte(agentEvents.occurredAt, desdeHace(VENTANA_HORAS_DEFECTO)),
          sql`${agentEvents.severity} IN ('warning', 'high', 'critical')`,
        ),
      )
      .orderBy(desc(agentEvents.occurredAt))
      .limit(200);

    const hallazgos: readonly Finding[] = evaluateGuardianRules(eventos, DEFAULT_THRESHOLDS);

    return {
      windowHours: VENTANA_HORAS_DEFECTO,
      eventsReviewed: eventos.length,
      findings: hallazgos.map((h) => ({
        code: h.code,
        title: h.title,
        summary: h.summary,
        severity: h.severity,
        confidence: h.confidence,
        evidenceRefs: h.evidenceEventIds.map((id) => `event:${id}`),
      })),
    };
  },
});

/** Salud del execution plane, desde la tabla de latidos. */
export const getAgentWorkerHealthTool: ErasedAgentTool = defineReadTool({
  name: 'getAgentWorkerHealth',
  description: 'Estado de los workers de agentes según sus últimos latidos.',
  permission: { module: 'agents', action: 'read' },
  run: async () => {
    const filas = await db
      .select({
        workerId: agentWorkerHeartbeats.workerId,
        status: agentWorkerHeartbeats.status,
        lastHeartbeatAt: agentWorkerHeartbeats.lastHeartbeatAt,
        currentRunId: agentWorkerHeartbeats.currentRunId,
      })
      .from(agentWorkerHeartbeats)
      .orderBy(desc(agentWorkerHeartbeats.lastHeartbeatAt))
      .limit(20);

    const ahora = Date.now();
    return {
      workers: filas.map((f) => ({
        workerId: f.workerId,
        status: f.status,
        secondsSinceHeartbeat: Math.floor((ahora - f.lastHeartbeatAt.getTime()) / 1000),
        busy: f.currentRunId !== null,
      })),
    };
  },
});

/**
 * Estado de la cola de agentes.
 *
 * Sin importes ni contenido de ejecuciones: solo recuentos por estado. Guardian
 * vigila que el sistema funcione, no qué hacen los demás agentes.
 */
export const getAgentQueueHealthTool: ErasedAgentTool = defineReadTool({
  name: 'getAgentQueueHealth',
  description: 'Recuento de ejecuciones por estado, para detectar cola atascada o fallos en cadena.',
  permission: { module: 'agents', action: 'read' },
  run: async () => {
    const filas = await db
      .select({ status: agentRuns.status, total: sql<string>`count(*)` })
      .from(agentRuns)
      .where(gte(agentRuns.createdAt, desdeHace(VENTANA_HORAS_DEFECTO)))
      .groupBy(agentRuns.status);

    const atascadas = await db
      .select({ total: sql<string>`count(*)` })
      .from(agentRuns)
      .where(
        and(
          sql`${agentRuns.status} IN ('queued', 'retry_scheduled')`,
          sql`${agentRuns.attempt} >= ${agentRuns.maxAttempts}`,
        ),
      );

    return {
      windowHours: VENTANA_HORAS_DEFECTO,
      byStatus: filas.map((f) => ({ status: f.status, count: Number(f.total) })),
      // Ejecuciones que el claim ya no coge y que ningún barrido recupera.
      stuckRuns: Number(atascadas[0]?.total ?? 0),
    };
  },
});

export const GUARDIAN_TOOLS: readonly ErasedAgentTool[] = [
  getSystemHealthSnapshotTool,
  getOpenOperationalIncidentsTool,
  getAgentWorkerHealthTool,
  getAgentQueueHealthTool,
];

/** Reexporta los nombres declarados en `definition.ts`, que es donde viven. */
export { GUARDIAN_TOOL_NAMES } from './definition';
