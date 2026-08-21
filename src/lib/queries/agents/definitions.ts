import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { agentDefinitions } from '@/db/schema';
import { AgentRuntimeError } from '@/lib/agents/errors';
import { db } from '@/lib/db';
import type { AgentDefinition } from '@/types';

/**
 * Repositorio de definiciones de agente.
 *
 * Es la única puerta para cambiar `status` y `mode`: el resto del runtime lee,
 * no escribe. Ver docs/agent-os/data-model.md §3.
 */

export async function listAgentDefinitions(): Promise<readonly AgentDefinition[]> {
  return db.select().from(agentDefinitions).orderBy(asc(agentDefinitions.slug));
}

export async function getAgentDefinitionBySlug(slug: string): Promise<AgentDefinition | null> {
  const [row] = await db
    .select()
    .from(agentDefinitions)
    .where(eq(agentDefinitions.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getAgentDefinitionById(id: number): Promise<AgentDefinition | null> {
  const [row] = await db.select().from(agentDefinitions).where(eq(agentDefinitions.id, id)).limit(1);
  return row ?? null;
}

/** Igual que `getAgentDefinitionBySlug`, pero falla con código estable. */
export async function requireAgentDefinition(slug: string): Promise<AgentDefinition> {
  const agent = await getAgentDefinitionBySlug(slug);
  if (!agent) {
    throw new AgentRuntimeError('agent_not_found', `No existe el agente '${slug}'.`);
  }
  return agent;
}

export type AgentStatus = AgentDefinition['status'];
export type AgentMode = AgentDefinition['mode'];

/**
 * Kill switch por agente. La llamada viene siempre de una Server Action con
 * `requireRole` delante (PR 4); esta función no autoriza por su cuenta.
 */
export async function setAgentStatus(id: number, status: AgentStatus): Promise<void> {
  await db
    .update(agentDefinitions)
    .set({ status, updatedAt: new Date() })
    .where(eq(agentDefinitions.id, id));
}

/** Cambio de autonomía: shadow → recommend → execute, nunca de un salto. */
export async function setAgentMode(id: number, mode: AgentMode): Promise<void> {
  await db
    .update(agentDefinitions)
    .set({ mode, updatedAt: new Date() })
    .where(eq(agentDefinitions.id, id));
}
