import type { InferSelectModel } from 'drizzle-orm';

import type {
  agentApprovals,
  agentDefinitions,
  agentEvents,
  agentMemories,
  agentRunSteps,
  agentRuns,
  agentSchedules,
  agentToolCalls,
  agentUsageLedger,
  agentWorkerHeartbeats,
} from '@/db/schema';

/** Filas de Zack Agent OS. Ver docs/agent-os/data-model.md. */
export type AgentDefinition = InferSelectModel<typeof agentDefinitions>;
export type AgentRun = InferSelectModel<typeof agentRuns>;
export type AgentRunStep = InferSelectModel<typeof agentRunSteps>;
export type AgentToolCall = InferSelectModel<typeof agentToolCalls>;
export type AgentApproval = InferSelectModel<typeof agentApprovals>;
export type AgentSchedule = InferSelectModel<typeof agentSchedules>;
export type AgentEvent = InferSelectModel<typeof agentEvents>;
export type AgentMemory = InferSelectModel<typeof agentMemories>;
export type AgentUsageEntry = InferSelectModel<typeof agentUsageLedger>;
export type AgentWorkerHeartbeat = InferSelectModel<typeof agentWorkerHeartbeats>;

/** Vista de una ejecución con su timeline, para el detalle de admin (PR 4). */
export type AgentRunWithSteps = AgentRun & {
  readonly steps: readonly AgentRunStep[];
};
