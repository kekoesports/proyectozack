import 'server-only';

import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';

import { agentEvents, agentRuns, ipEvidenceEvents } from '@/db/schema';
import { db } from '@/lib/db';
import { defineReadTool } from '../tools/define';
import type { ErasedAgentTool } from '../types';

export const getDevelopmentEvidenceTool: ErasedAgentTool = defineReadTool({
  name: 'getDevelopmentEvidence',
  description: 'Cambios de software documentados, señales de despliegue y errores de agentes recientes. No equivale a consultar CI en GitHub.',
  permission: { module: 'infrastructure', action: 'read' },
  run: async () => {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [changes, deploymentSignals, failures] = await Promise.all([
      db.select({ id: ipEvidenceEvents.id, kind: ipEvidenceEvents.evidenceKind,
        title: ipEvidenceEvents.title, occurredAt: ipEvidenceEvents.occurredAt })
        .from(ipEvidenceEvents)
        .where(and(gte(ipEvidenceEvents.occurredAt, since),
          inArray(ipEvidenceEvents.evidenceKind, ['github_pr', 'git_commit', 'deployment', 'test_run'])))
        .orderBy(desc(ipEvidenceEvents.occurredAt)).limit(30),
      db.select({ source: agentEvents.source, count: sql<number>`count(*)::int`,
        latestAt: sql<string>`max(${agentEvents.occurredAt})` })
        .from(agentEvents).where(and(eq(agentEvents.eventType, 'app.deploy'),
          gte(agentEvents.occurredAt, since))).groupBy(agentEvents.source),
      db.select({ runId: agentRuns.id, agentId: agentRuns.agentId,
        status: agentRuns.status, errorCode: agentRuns.lastErrorCode,
        completedAt: agentRuns.completedAt })
        .from(agentRuns).where(and(gte(agentRuns.createdAt, since),
          inArray(agentRuns.status, ['failed', 'dead_letter'])))
        .orderBy(desc(agentRuns.createdAt)).limit(20),
    ]);
    return { generatedAt: new Date().toISOString(), periodStart: since.toISOString(),
      changes, deploymentSignals, failures,
      coverage: { ci: 'not_verified', deploymentSignalsAreNotSuccessProof: true,
        evidenceMayBeIncomplete: true, changesAreNotHumanHours: true } };
  },
});

export const DEV_TOOLS: readonly ErasedAgentTool[] = [getDevelopmentEvidenceTool];
