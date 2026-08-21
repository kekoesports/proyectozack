import 'server-only';

import { and, desc, eq, gte, sql } from 'drizzle-orm';

import {
  agentApprovals,
  agentDefinitions,
  agentMemories,
  agentRunSteps,
  agentRuns,
  agentSchedules,
  agentToolCalls,
  agentUsageLedger,
  user,
} from '@/db/schema';
import { isIndeterminateErrorCode } from '@/lib/agents/run-state';
import { db } from '@/lib/db';
import type {
  AgentApproval,
  AgentDefinition,
  AgentMemory,
  AgentRun,
  AgentRunStep,
  AgentSchedule,
  AgentToolCall,
} from '@/types';

/**
 * Lecturas del panel de agentes.
 *
 * Separadas de los repositorios del runtime a propósito: estas agregan y
 * enriquecen para una pantalla, aquellas sirven a la ejecución. Mezclarlas
 * llevaría a que el worker cargara `join`s que no necesita.
 */

export type AgentWithActivity = AgentDefinition & {
  readonly runsLast7Days: number;
  readonly failedLast7Days: number;
  readonly pendingApprovals: number;
  readonly spentThisMonthMicros: number;
  readonly lastRunAt: Date | null;
};

function inicioDelMes(ahora: Date): Date {
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
}

/**
 * Normaliza lo que devuelve un agregado SQL a `Date`.
 *
 * Un `sql<Date>` en Drizzle es una **afirmación**, no una conversión: el driver
 * entrega lo que entrega —una cadena ISO— y el tipo dice `Date`. La diferencia
 * no se nota hasta que alguien llama a `.getTime()`.
 */
function toDate(valor: unknown): Date | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor;
  const d = new Date(String(valor));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Catálogo con la actividad reciente de cada agente. */
export async function listAgentsWithActivity(ahora: Date = new Date()): Promise<readonly AgentWithActivity[]> {
  const agentes = await db.select().from(agentDefinitions).orderBy(agentDefinitions.slug);
  if (agentes.length === 0) return [];

  const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const desdeMes = inicioDelMes(ahora);

  const actividad = await db
    .select({
      agentId: agentRuns.agentId,
      total: sql<string>`count(*)`,
      fallidos: sql<string>`count(*) filter (where ${agentRuns.status} in ('failed', 'dead_letter'))`,
      ultimo: sql<Date | null>`max(${agentRuns.createdAt})`,
    })
    .from(agentRuns)
    .where(gte(agentRuns.createdAt, hace7Dias))
    .groupBy(agentRuns.agentId);

  const gasto = await db
    .select({
      agentId: agentUsageLedger.agentId,
      coste: sql<string>`coalesce(sum(${agentUsageLedger.estimatedCostMicros}), 0)`,
    })
    .from(agentUsageLedger)
    .where(gte(agentUsageLedger.occurredAt, desdeMes))
    .groupBy(agentUsageLedger.agentId);

  const pendientes = await db
    .select({
      agentId: agentRuns.agentId,
      total: sql<string>`count(*)`,
    })
    .from(agentApprovals)
    .innerJoin(agentRuns, eq(agentApprovals.runId, agentRuns.id))
    .where(eq(agentApprovals.status, 'pending'))
    .groupBy(agentRuns.agentId);

  const porId = new Map(actividad.map((a) => [a.agentId, a]));
  const gastoPorId = new Map(gasto.map((g) => [g.agentId, Number(g.coste)]));
  const pendientesPorId = new Map(pendientes.map((p) => [p.agentId, Number(p.total)]));

  return agentes.map((agente) => ({
    ...agente,
    runsLast7Days: Number(porId.get(agente.id)?.total ?? 0),
    failedLast7Days: Number(porId.get(agente.id)?.fallidos ?? 0),
    pendingApprovals: pendientesPorId.get(agente.id) ?? 0,
    spentThisMonthMicros: gastoPorId.get(agente.id) ?? 0,
    // `sql<Date | null>` declara el tipo, no lo convierte: Drizzle se cree lo
    // que le digas y el driver devuelve la fecha como cadena. Sin este
    // `toDate`, la página reventaba con `fecha.getTime is not a function` en
    // cuanto había una sola ejecución.
    lastRunAt: toDate(porId.get(agente.id)?.ultimo),
  }));
}

export type AgentRunListItem = AgentRun & {
  readonly agentSlug: string;
  readonly agentName: string;
  /** `true` si el desenlace fue "no se sabe qué pasó". La UI lo destaca. */
  readonly outcomeUnknown: boolean;
  /** `true` si está en cola pero el claim ya no puede cogerla. */
  readonly stuck: boolean;
};

export type ListRunsFilters = {
  readonly agentId?: number | undefined;
  readonly status?: AgentRun['status'] | undefined;
  readonly limit?: number | undefined;
};

export async function listAgentRunsForAdmin(
  filtros: ListRunsFilters = {},
): Promise<readonly AgentRunListItem[]> {
  const condiciones = [
    filtros.agentId !== undefined ? eq(agentRuns.agentId, filtros.agentId) : undefined,
    filtros.status !== undefined ? eq(agentRuns.status, filtros.status) : undefined,
  ].filter((c) => c !== undefined);

  const filas = await db
    .select({
      run: agentRuns,
      agentSlug: agentDefinitions.slug,
      agentName: agentDefinitions.displayName,
    })
    .from(agentRuns)
    .innerJoin(agentDefinitions, eq(agentRuns.agentId, agentDefinitions.id))
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .orderBy(desc(agentRuns.createdAt))
    .limit(Math.min(filtros.limit ?? 100, 300));

  return filas.map(({ run, agentSlug, agentName }) => ({
    ...run,
    agentSlug,
    agentName,
    outcomeUnknown: isIndeterminateErrorCode(run.lastErrorCode),
    stuck:
      (run.status === 'queued' || run.status === 'retry_scheduled') && run.attempt >= run.maxAttempts,
  }));
}

export type AgentRunDetail = {
  readonly run: AgentRunListItem;
  readonly steps: readonly AgentRunStep[];
  readonly toolCalls: readonly AgentToolCall[];
  readonly approvals: readonly AgentApproval[];
  readonly usageMicros: number;
};

export async function getAgentRunDetail(runId: number): Promise<AgentRunDetail | null> {
  const [fila] = await db
    .select({
      run: agentRuns,
      agentSlug: agentDefinitions.slug,
      agentName: agentDefinitions.displayName,
    })
    .from(agentRuns)
    .innerJoin(agentDefinitions, eq(agentRuns.agentId, agentDefinitions.id))
    .where(eq(agentRuns.id, runId))
    .limit(1);

  if (!fila) return null;

  const [steps, toolCalls, approvals, usage] = await Promise.all([
    db.select().from(agentRunSteps).where(eq(agentRunSteps.runId, runId)).orderBy(agentRunSteps.sequence),
    db.select().from(agentToolCalls).where(eq(agentToolCalls.runId, runId)).orderBy(agentToolCalls.createdAt),
    db.select().from(agentApprovals).where(eq(agentApprovals.runId, runId)).orderBy(desc(agentApprovals.requestedAt)),
    db
      .select({ coste: sql<string>`coalesce(sum(${agentUsageLedger.estimatedCostMicros}), 0)` })
      .from(agentUsageLedger)
      .where(eq(agentUsageLedger.runId, runId)),
  ]);

  return {
    run: {
      ...fila.run,
      agentSlug: fila.agentSlug,
      agentName: fila.agentName,
      outcomeUnknown: isIndeterminateErrorCode(fila.run.lastErrorCode),
      stuck:
        (fila.run.status === 'queued' || fila.run.status === 'retry_scheduled') &&
        fila.run.attempt >= fila.run.maxAttempts,
    },
    steps,
    toolCalls,
    approvals,
    usageMicros: Number(usage[0]?.coste ?? 0),
  };
}

export type PendingApprovalItem = AgentApproval & {
  readonly agentSlug: string;
  readonly toolName: string;
  readonly toolVersion: string;
};

/** Cola de aprobaciones, la más urgente primero. */
export async function listPendingApprovalsForAdmin(limite = 50): Promise<readonly PendingApprovalItem[]> {
  const filas = await db
    .select({
      approval: agentApprovals,
      agentSlug: agentDefinitions.slug,
      toolName: agentToolCalls.toolName,
      toolVersion: agentToolCalls.toolVersion,
    })
    .from(agentApprovals)
    .innerJoin(agentRuns, eq(agentApprovals.runId, agentRuns.id))
    .innerJoin(agentDefinitions, eq(agentRuns.agentId, agentDefinitions.id))
    .innerJoin(agentToolCalls, eq(agentApprovals.toolCallId, agentToolCalls.id))
    .where(eq(agentApprovals.status, 'pending'))
    .orderBy(agentApprovals.expiresAt)
    .limit(limite);

  return filas.map((f) => ({
    ...f.approval,
    agentSlug: f.agentSlug,
    toolName: f.toolName,
    toolVersion: f.toolVersion,
  }));
}

export type AgentMemoryItem = AgentMemory & {
  readonly agentSlug: string | null;
  readonly createdByName: string | null;
};

export async function listAgentMemories(limite = 100): Promise<readonly AgentMemoryItem[]> {
  const filas = await db
    .select({
      memoria: agentMemories,
      agentSlug: agentDefinitions.slug,
      createdByName: user.name,
    })
    .from(agentMemories)
    .leftJoin(agentDefinitions, eq(agentMemories.agentId, agentDefinitions.id))
    .leftJoin(user, eq(agentMemories.createdByUserId, user.id))
    .orderBy(desc(agentMemories.updatedAt))
    .limit(limite);

  return filas.map((f) => ({
    ...f.memoria,
    agentSlug: f.agentSlug,
    createdByName: f.createdByName,
  }));
}

export type AgentScheduleItem = AgentSchedule & {
  readonly agentSlug: string;
  readonly agentStatus: AgentDefinition['status'];
};

export async function listAgentSchedulesForAdmin(): Promise<readonly AgentScheduleItem[]> {
  const filas = await db
    .select({ schedule: agentSchedules, agentSlug: agentDefinitions.slug, agentStatus: agentDefinitions.status })
    .from(agentSchedules)
    .innerJoin(agentDefinitions, eq(agentSchedules.agentId, agentDefinitions.id))
    .orderBy(agentSchedules.slug);

  return filas.map((f) => ({ ...f.schedule, agentSlug: f.agentSlug, agentStatus: f.agentStatus }));
}

export type BudgetOverview = {
  readonly globalSpentMicros: number;
  readonly perAgent: readonly { readonly slug: string; readonly spentMicros: number; readonly limitMicros: number }[];
  /** `true` si algún consumo del mes no tenía tarifa: el total es un mínimo. */
  readonly pricingUnknown: boolean;
};

export async function getBudgetOverview(ahora: Date = new Date()): Promise<BudgetOverview> {
  const desde = inicioDelMes(ahora);

  const filas = await db
    .select({
      slug: agentDefinitions.slug,
      limite: agentDefinitions.monthlyBudgetMicros,
      coste: sql<string>`coalesce(sum(${agentUsageLedger.estimatedCostMicros}), 0)`,
      desconocido: sql<boolean>`coalesce(bool_or(${agentUsageLedger.pricingUnknown}), false)`,
    })
    .from(agentDefinitions)
    .leftJoin(
      agentUsageLedger,
      and(eq(agentUsageLedger.agentId, agentDefinitions.id), gte(agentUsageLedger.occurredAt, desde)),
    )
    .groupBy(agentDefinitions.slug, agentDefinitions.monthlyBudgetMicros)
    .orderBy(agentDefinitions.slug);

  return {
    globalSpentMicros: filas.reduce((suma, f) => suma + Number(f.coste), 0),
    perAgent: filas.map((f) => ({
      slug: f.slug,
      spentMicros: Number(f.coste),
      limitMicros: f.limite,
    })),
    pricingUnknown: filas.some((f) => f.desconocido === true),
  };
}
