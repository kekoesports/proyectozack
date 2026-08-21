import 'server-only';

import { z } from 'zod';

import { ROLES, type Role } from '@/lib/auth-guard';
import { logRedacted } from '@/lib/log';

import { runAgentLoop, type AgentLoopEvent, type AgentLoopOutcome } from '../agent-loop';
import { redactForStorage } from '../redaction';
import { resolveAgentModelProvider } from '../providers';
import { getAgentToolRegistry } from '../tools';
import type { AgentToolContext } from '../types';
import { isRunStillOurs } from './lease';
import { buildRunPersistence } from './persistence';
import type { AgentDefinition, AgentRun } from '@/types';

/**
 * Ejecuta una ejecución ya reclamada: monta el contexto, corre el bucle y
 * persiste lo que produce.
 *
 * Es la costura entre PR 2 y la base de datos. El bucle no sabe que existe
 * Postgres —recibe dependencias y emite eventos— y esta función es la que las
 * conecta con las tablas de PR 1.
 */

/**
 * Rol efectivo cuando no hay un humano detrás.
 *
 * Un run de rutina o de evento necesita un rol para que el RBAC del CRM decida,
 * y no puede heredarlo de nadie. El default es `analyst` —lectura de analytics
 * y poco más— porque un agente que se ejecuta solo debe empezar por el permiso
 * más pequeño que le sirva, no por el más cómodo.
 *
 * Un agente puede declarar otro en `settings_json.systemRole`, validado contra
 * la lista real de roles. `admin` queda fuera a propósito: un agente que se
 * ejecuta sin supervisión no opera como administrador.
 */
export const ROL_SISTEMA_POR_DEFECTO: Role = 'analyst';

const ROLES_SISTEMA_PROHIBIDOS: readonly Role[] = ['admin', 'admin_limited_tasks', 'brand'];

const settingsSchema = z
  .object({
    systemRole: z
      .enum(ROLES)
      .refine((r) => !ROLES_SISTEMA_PROHIBIDOS.includes(r), {
        message: 'systemRole no puede ser admin, admin_limited_tasks ni brand',
      })
      .optional(),
  })
  .passthrough();

/**
 * Rol con el que se ejecuta.
 *
 * En esta fase es siempre el de sistema, también cuando hay un `triggered_by_user_id`.
 * Podría parecer que un run disparado por un admin debería heredar su rol, pero
 * el worker no tiene su sesión: solo un id de usuario guardado en una fila, y
 * derivar permisos de eso sería creerse un dato en lugar de una sesión
 * autenticada. El rol real del humano lo resolverá el control plane en PR 4,
 * donde sí hay sesión.
 *
 * Mientras tanto el efecto es que un run manual tiene **menos** permisos de los
 * que tendría su autor, no más. Es el lado correcto en el que equivocarse.
 */
export function resolveActorRole(agente: AgentDefinition): Role {
  const parsed = settingsSchema.safeParse(agente.settingsJson);
  if (!parsed.success) return ROL_SISTEMA_POR_DEFECTO;
  return parsed.data.systemRole ?? ROL_SISTEMA_POR_DEFECTO;
}

export type ExecuteRunOptions = {
  readonly run: AgentRun;
  readonly agent: AgentDefinition;
  readonly workerId: string;
  readonly agentsEnabled: boolean;
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly signal: AbortSignal;
};

export async function executeAgentRun(opts: ExecuteRunOptions): Promise<AgentLoopOutcome> {
  const { run, agent, workerId } = opts;
  const registro = getAgentToolRegistry();
  const tools = registro.listForAgent(agent.slug);
  const provider = resolveAgentModelProvider(agent.modelProvider, agent.modelName);

  const ctx: AgentToolContext = {
    runId: run.id,
    agentId: agent.id,
    agentSlug: agent.slug,
    agentMode: agent.mode,
    actorRole: resolveActorRole(agent),
    actorUserId: run.triggeredByUserId,
    correlationId: run.correlationId,
    signal: opts.signal,
  };

  const persistencia = buildRunPersistence({ run, agent, workerId });

  const onEvent = async (evento: AgentLoopEvent): Promise<void> => {
    try {
      await persistencia.handleEvent(evento);
    } catch (err) {
      // Perder una traza no debe tumbar la ejecución, pero sí quedar dicho: una
      // timeline incompleta es una auditoría incompleta.
      logRedacted('warn', `[agents] no se pudo persistir el evento ${evento.kind}:`, err);
    }
  };

  return runAgentLoop(
    {
      provider,
      tools,
      executor: {
        registry: registro,
        agentsEnabled: opts.agentsEnabled,
        agentStatus: agent.status,
        isRunActive: () => isRunStillOurs(run.id, workerId),
        getBudgetSnapshot: persistencia.getBudgetSnapshot,
        findApproval: persistencia.findApproval,
        consumeApproval: persistencia.consumeApproval,
        findPreviousCall: persistencia.findPreviousCall,
        beginToolCall: persistencia.beginToolCall,
        settleToolCall: persistencia.settleToolCall,
        policyVersion: agent.policyVersion,
        now: () => new Date(),
      },
      limits: {
        maxTurns: agent.maxTurnsPerRun,
        maxToolCalls: agent.maxToolCallsPerRun,
        maxDurationSeconds: agent.maxDurationSeconds,
      },
      getBudgetSnapshot: persistencia.getBudgetSnapshot,
      onEvent,
      now: () => new Date(),
      maxOutputTokens: 2_048,
    },
    {
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      ctx,
    },
  );
}

/** Resumen redactado para `agent_runs.output_summary`. */
export function summarizeOutcome(outcome: AgentLoopOutcome): string {
  switch (outcome.status) {
    case 'completed':
      return String(redactForStorage({ value: outcome.finalText }).value ?? '').slice(0, 2_000);
    case 'waiting_approval':
      return `Esperando aprobación para '${outcome.toolName}'.`;
    case 'stopped':
      return `Detenida: ${outcome.reason} (${outcome.detail}).`;
    case 'failed':
      return `Fallo ${outcome.code}: ${outcome.message}`;
  }
}
