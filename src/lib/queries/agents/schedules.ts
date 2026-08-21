import 'server-only';

import { and, asc, eq, lte } from 'drizzle-orm';

import { agentSchedules } from '@/db/schema';
import { db } from '@/lib/db';
import type { AgentSchedule } from '@/types';

/**
 * Rutinas programadas.
 *
 * `upsertAgentSchedule` es lo que usa el seed, y por eso no toca `enabled`:
 * volver a sembrar puede corregir la expresión cron o el nombre, pero jamás
 * encender una rutina. Activarla es un acto humano con nombre y fecha.
 *
 * Ver docs/agent-os/data-model.md §8.
 */

export type UpsertAgentScheduleInput = {
  readonly slug: string;
  readonly agentId: number;
  readonly name: string;
  readonly cronExpression: string;
  readonly timezone?: string;
  readonly catchUpPolicy?: AgentSchedule['catchUpPolicy'];
  readonly maxCatchUpRuns?: number;
  readonly inputJson?: Record<string, unknown>;
  readonly createdByUserId?: string | null;
};

export async function upsertAgentSchedule(input: UpsertAgentScheduleInput): Promise<AgentSchedule> {
  const now = new Date();
  const [row] = await db
    .insert(agentSchedules)
    .values({
      slug: input.slug,
      agentId: input.agentId,
      name: input.name,
      cronExpression: input.cronExpression,
      timezone: input.timezone ?? 'Europe/Madrid',
      // Nace desactivada, siempre.
      enabled: false,
      catchUpPolicy: input.catchUpPolicy ?? 'skip',
      maxCatchUpRuns: input.maxCatchUpRuns ?? 1,
      inputJson: input.inputJson ?? {},
      createdByUserId: input.createdByUserId ?? null,
    })
    .onConflictDoUpdate({
      target: agentSchedules.slug,
      set: {
        agentId: input.agentId,
        name: input.name,
        cronExpression: input.cronExpression,
        timezone: input.timezone ?? 'Europe/Madrid',
        catchUpPolicy: input.catchUpPolicy ?? 'skip',
        maxCatchUpRuns: input.maxCatchUpRuns ?? 1,
        inputJson: input.inputJson ?? {},
        updatedAt: now,
      },
    })
    .returning();

  if (!row) throw new Error(`agent-schedules: no se pudo guardar '${input.slug}'`);
  return row;
}

export async function listAgentSchedules(): Promise<readonly AgentSchedule[]> {
  return db.select().from(agentSchedules).orderBy(asc(agentSchedules.slug));
}

export async function getAgentScheduleBySlug(slug: string): Promise<AgentSchedule | null> {
  const [row] = await db.select().from(agentSchedules).where(eq(agentSchedules.slug, slug)).limit(1);
  return row ?? null;
}

/**
 * Rutinas vencidas. El scheduler (PR 3) las materializa bajo advisory lock y
 * con clave idempotente por ventana; aquí solo se listan.
 */
export async function listDueAgentSchedules(now: Date = new Date()): Promise<readonly AgentSchedule[]> {
  return db
    .select()
    .from(agentSchedules)
    .where(and(eq(agentSchedules.enabled, true), lte(agentSchedules.nextRunAt, now)))
    .orderBy(asc(agentSchedules.nextRunAt));
}

/**
 * Enciende o apaga una rutina.
 *
 * Encenderla exige `nextRunAt`: el CHECK `agent_schedules_enabled_next_ck` no
 * admite una rutina activa sin próxima ventana, que sería una que nunca se
 * dispara y que nadie echaría en falta.
 */
export async function setAgentScheduleEnabled(
  id: number,
  enabled: boolean,
  nextRunAt: Date | null,
): Promise<void> {
  if (enabled && !nextRunAt) {
    throw new Error('agent-schedules: activar una rutina exige una próxima ventana');
  }
  await db
    .update(agentSchedules)
    .set({ enabled, nextRunAt, updatedAt: new Date() })
    .where(eq(agentSchedules.id, id));
}

/** Avanza la ventana tras materializar una ejecución. */
export async function recordScheduleTick(
  id: number,
  scheduledFor: Date,
  nextRunAt: Date,
  runId: number | null,
): Promise<void> {
  await db
    .update(agentSchedules)
    .set({ lastScheduledFor: scheduledFor, nextRunAt, lastRunId: runId, updatedAt: new Date() })
    .where(eq(agentSchedules.id, id));
}
