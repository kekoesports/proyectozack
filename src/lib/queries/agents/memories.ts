import 'server-only';

import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';

import { agentMemories } from '@/db/schema';
import { AgentRuntimeError } from '@/lib/agents/errors';
import { validateMemoryScope } from '@/lib/agents/memory-scope';
import { db } from '@/lib/db';
import type { AgentMemory } from '@/types';

/**
 * Memoria curada.
 *
 * Nada entra en `verified` por su cuenta: se propone, y un humano la verifica.
 * Es la diferencia entre un hecho comprobado y algo que el modelo creyó
 * entender en una conversación.
 *
 * Ver docs/agent-os/data-model.md §10.
 */

export type CreateAgentMemoryInput = {
  readonly scope: AgentMemory['scope'];
  readonly scopeUserId?: string | null;
  readonly agentId?: number | null;
  readonly memoryKey: string;
  /** Contenido ya redactado. Nunca NIF, IBAN, importes ni secretos. */
  readonly content: string;
  readonly contentJson?: Record<string, unknown> | null;
  readonly sensitivity?: AgentMemory['sensitivity'];
  readonly confidencePct?: number | null;
  readonly sourceType: string;
  readonly sourceRef?: string | null;
  readonly validUntil?: Date | null;
  readonly supersedesMemoryId?: number | null;
  readonly createdByUserId?: string | null;
};

/** Siempre nace `proposed`: verificar es un acto aparte y con firma. */
export async function createAgentMemory(input: CreateAgentMemoryInput): Promise<AgentMemory> {
  const scopeCheck = validateMemoryScope({
    scope: input.scope,
    scopeUserId: input.scopeUserId ?? null,
    agentId: input.agentId ?? null,
  });
  if (!scopeCheck.ok) {
    throw new AgentRuntimeError('agent_memory_scope_invalid', `Scope de memoria inválido: ${scopeCheck.code}`);
  }

  const [row] = await db
    .insert(agentMemories)
    .values({
      scope: input.scope,
      scopeUserId: input.scopeUserId ?? null,
      agentId: input.agentId ?? null,
      memoryKey: input.memoryKey,
      content: input.content,
      contentJson: input.contentJson ?? null,
      sensitivity: input.sensitivity ?? 'internal',
      verificationStatus: 'proposed',
      confidencePct: input.confidencePct ?? null,
      sourceType: input.sourceType,
      sourceRef: input.sourceRef ?? null,
      validUntil: input.validUntil ?? null,
      supersedesMemoryId: input.supersedesMemoryId ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();

  if (!row) throw new AgentRuntimeError('agent_memory_scope_invalid', 'No se pudo guardar la memoria.');
  return row;
}

/** Verificar exige un humano identificable: lo pide también el CHECK de la tabla. */
export async function verifyAgentMemory(id: number, verifiedByUserId: string): Promise<void> {
  await db
    .update(agentMemories)
    .set({ verificationStatus: 'verified', verifiedByUserId, updatedAt: new Date() })
    .where(eq(agentMemories.id, id));
}

/**
 * Revoca sin borrar. La fila se conserva porque saber que algo se creyó
 * cierto, y hasta cuándo, es parte de la auditoría.
 */
export async function revokeAgentMemory(id: number): Promise<void> {
  await db
    .update(agentMemories)
    .set({ verificationStatus: 'revoked', updatedAt: new Date() })
    .where(eq(agentMemories.id, id));
}

export type MemoryRetrievalScope = {
  readonly agentId: number;
  readonly userId: string | null;
};

/**
 * Memoria admisible en el contexto de un agente.
 *
 * El filtro va en SQL, no en TypeScript: la memoria de otro usuario o de otro
 * agente no debe llegar siquiera al proceso. `restricted` queda fuera aunque
 * esté verificada — para eso hay tools auditadas.
 */
export async function listRetrievableMemories(
  scope: MemoryRetrievalScope,
  limit = 50,
): Promise<readonly AgentMemory[]> {
  const visibleScope = or(
    eq(agentMemories.scope, 'global'),
    eq(agentMemories.scope, 'team'),
    and(eq(agentMemories.scope, 'agent'), eq(agentMemories.agentId, scope.agentId)),
    scope.userId
      ? and(eq(agentMemories.scope, 'user'), eq(agentMemories.scopeUserId, scope.userId))
      : sql`false`,
  );

  return db
    .select()
    .from(agentMemories)
    .where(
      and(
        eq(agentMemories.verificationStatus, 'verified'),
        sql`${agentMemories.sensitivity} <> 'restricted'`,
        or(isNull(agentMemories.validUntil), sql`${agentMemories.validUntil} > now()`),
        visibleScope,
      ),
    )
    .orderBy(desc(agentMemories.updatedAt))
    .limit(Math.min(limit, 200));
}

export async function getAgentMemory(id: number): Promise<AgentMemory | null> {
  const [row] = await db.select().from(agentMemories).where(eq(agentMemories.id, id)).limit(1);
  return row ?? null;
}
