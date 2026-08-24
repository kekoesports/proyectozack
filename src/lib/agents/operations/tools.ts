import 'server-only';

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  agentEvents,
  automationDealDrafts,
  campaigns,
  caseStudies,
  contactSubmissions,
  crmTasks,
  posts,
  talents,
} from '@/db/schema';
import { db } from '@/lib/db';

import { defineReadTool } from '../tools/define';
import type { ErasedAgentTool } from '../types';

const numero = (value: string | number | null | undefined): number => Number(value ?? 0);

export const getOperationalCampaignSummaryTool: ErasedAgentTool = defineReadTool({
  name: 'getOperationalCampaignSummary',
  description: 'Resumen operativo de campañas, bloqueos de datos, vencimientos, seguimiento y tareas atrasadas.',
  permission: { module: 'campanas', action: 'read' },
  run: async () => {
    const [porEstado, problemas, tareas] = await Promise.all([
      db
        .select({ status: campaigns.status, total: sql<string>`count(*)` })
        .from(campaigns)
        .where(isNull(campaigns.archivedAt))
        .groupBy(campaigns.status),
      db
        .select({
          total: sql<string>`count(*)`,
          withoutOwner: sql<string>`count(*) filter (where ${campaigns.responsibleUserId} is null and ${campaigns.assignedToUserId} is null)`,
          missingDates: sql<string>`count(*) filter (where ${campaigns.startDate} is null or ${campaigns.endDate} is null)`,
          pastDeadline: sql<string>`count(*) filter (where ${campaigns.endDate} < current_date and ${campaigns.status} not in ('completada', 'cancelada', 'pagada'))`,
          trackingAlerts: sql<string>`count(*) filter (where ${campaigns.trackingAlertLevel} > 0 or ${campaigns.trackingSyncError} is not null)`,
          missingSheet: sql<string>`count(*) filter (where ${campaigns.trackingSheetUrl} is null and ${campaigns.status} in ('aprobada', 'activa'))`,
        })
        .from(campaigns)
        .where(isNull(campaigns.archivedAt)),
      db
        .select({
          overdue: sql<string>`count(*) filter (where ${crmTasks.dueDate} < current_date and ${crmTasks.status} in ('pendiente', 'en_progreso'))`,
          unassigned: sql<string>`count(*) filter (where ${crmTasks.assignedToUserId} is null and ${crmTasks.status} in ('pendiente', 'en_progreso'))`,
        })
        .from(crmTasks),
    ]);

    const issue = problemas[0];
    const task = tareas[0];
    return {
      generatedAt: new Date().toISOString(),
      campaignsByStatus: porEstado.map((row) => ({ status: row.status, count: numero(row.total) })),
      totals: {
        activeRecords: numero(issue?.total),
        withoutOwner: numero(issue?.withoutOwner),
        missingDates: numero(issue?.missingDates),
        pastDeadline: numero(issue?.pastDeadline),
        trackingAlerts: numero(issue?.trackingAlerts),
        approvedOrActiveWithoutSheet: numero(issue?.missingSheet),
        overdueTasks: numero(task?.overdue),
        unassignedOpenTasks: numero(task?.unassigned),
      },
    };
  },
});

export const getDealDraftQueueTool: ErasedAgentTool = defineReadTool({
  name: 'getDealDraftQueue',
  description: 'Estado agregado y últimas entradas de la cola de borradores de trato, sin texto crudo ni datos personales.',
  permission: { module: 'campanas', action: 'read' },
  run: async () => {
    const [porEstado, recientes] = await Promise.all([
      db
        .select({ status: automationDealDrafts.status, total: sql<string>`count(*)` })
        .from(automationDealDrafts)
        .groupBy(automationDealDrafts.status),
      db
        .select({
          id: automationDealDrafts.id,
          source: automationDealDrafts.source,
          status: automationDealDrafts.status,
          campaignId: automationDealDrafts.campaignId,
          sheetShareStatus: automationDealDrafts.sheetShareStatus,
          discordNotifiedAt: automationDealDrafts.discordNotifiedAt,
          error: automationDealDrafts.error,
          createdAt: automationDealDrafts.createdAt,
          updatedAt: automationDealDrafts.updatedAt,
        })
        .from(automationDealDrafts)
        .where(inArray(automationDealDrafts.status, ['missing_info', 'pending_review', 'failed', 'approved']))
        .orderBy(desc(automationDealDrafts.updatedAt))
        .limit(25),
    ]);

    const now = Date.now();
    return {
      generatedAt: new Date(now).toISOString(),
      byStatus: porEstado.map((row) => ({ status: row.status, count: numero(row.total) })),
      attentionQueue: recientes.map((row) => ({
        draftId: row.id,
        source: row.source,
        status: row.status,
        campaignId: row.campaignId,
        sheetShareStatus: row.sheetShareStatus,
        discordConfirmed: row.discordNotifiedAt !== null,
        hasError: Boolean(row.error),
        ageHours: Math.max(0, Math.floor((now - row.createdAt.getTime()) / 3_600_000)),
        updatedAt: row.updatedAt,
      })),
    };
  },
});

export const getInboundLeadQueueTool: ErasedAgentTool = defineReadTool({
  name: 'getInboundLeadQueue',
  description: 'Cola comercial agregada y señales mínimas de leads nuevos, sin emails, teléfonos, nombres ni mensajes.',
  permission: { module: 'leads', action: 'read' },
  run: async () => {
    const [porEstado, porTipo, recientes] = await Promise.all([
      db
        .select({ status: contactSubmissions.status, total: sql<string>`count(*)` })
        .from(contactSubmissions)
        .groupBy(contactSubmissions.status),
      db
        .select({ type: contactSubmissions.type, total: sql<string>`count(*)` })
        .from(contactSubmissions)
        .where(eq(contactSubmissions.status, 'nuevo'))
        .groupBy(contactSubmissions.type),
      db
        .select({
          id: contactSubmissions.id,
          status: contactSubmissions.status,
          type: contactSubmissions.type,
          vertical: contactSubmissions.vertical,
          campaignType: contactSubmissions.campaignType,
          budget: contactSubmissions.budget,
          assignedToId: contactSubmissions.assignedToId,
          respondedAt: contactSubmissions.respondedAt,
          createdAt: contactSubmissions.createdAt,
        })
        .from(contactSubmissions)
        .where(eq(contactSubmissions.status, 'nuevo'))
        .orderBy(desc(contactSubmissions.createdAt))
        .limit(25),
    ]);

    const now = Date.now();
    return {
      generatedAt: new Date(now).toISOString(),
      byStatus: porEstado.map((row) => ({ status: row.status, count: numero(row.total) })),
      newByType: porTipo.map((row) => ({ type: row.type, count: numero(row.total) })),
      newLeadSignals: recientes.map((row) => ({
        leadId: row.id,
        type: row.type,
        status: row.status,
        vertical: row.vertical,
        campaignType: row.campaignType,
        budgetConfirmed: Boolean(row.budget),
        assigned: row.assignedToId !== null,
        responded: row.respondedAt !== null,
        ageHours: Math.max(0, Math.floor((now - row.createdAt.getTime()) / 3_600_000)),
      })),
    };
  },
});

export const getSeoOperationsSnapshotTool: ErasedAgentTool = defineReadTool({
  name: 'getSeoOperationsSnapshot',
  description: 'Último snapshot validado de Search Console y resumen del inventario SEO del CRM.',
  permission: { module: 'analytics', action: 'read' },
  run: async () => {
    const [searchConsole, contenido, talento, casos] = await Promise.all([
      db
        .select({ payload: agentEvents.payloadJson, occurredAt: agentEvents.occurredAt })
        .from(agentEvents)
        .where(
          and(
            eq(agentEvents.source, 'google-search-console'),
            eq(agentEvents.eventType, 'seo.search_console_snapshot'),
          ),
        )
        .orderBy(desc(agentEvents.occurredAt))
        .limit(1),
      db
        .select({
          total: sql<string>`count(*)`,
          published: sql<string>`count(*) filter (where ${posts.status} = 'published')`,
          drafts: sql<string>`count(*) filter (where ${posts.status} = 'draft')`,
          withoutCover: sql<string>`count(*) filter (where ${posts.status} = 'published' and ${posts.coverUrl} is null)`,
        })
        .from(posts),
      db
        .select({
          total: sql<string>`count(*) filter (where ${talents.archivedAt} is null)`,
          published: sql<string>`count(*) filter (where ${talents.isPublished} = true and ${talents.archivedAt} is null)`,
          missingSeo: sql<string>`count(*) filter (where ${talents.isPublished} = true and (${talents.seoTitle} is null or ${talents.seoDescription} is null))`,
          staleMetrics: sql<string>`count(*) filter (where ${talents.isPublished} = true and (${talents.lastStatsUpdateAt} is null or ${talents.lastStatsUpdateAt} < now() - interval '90 days'))`,
        })
        .from(talents),
      db
        .select({
          total: sql<string>`count(*)`,
          published: sql<string>`count(*) filter (where ${caseStudies.isPublished} = true)`,
        })
        .from(caseStudies),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      searchConsole: searchConsole[0] ?? null,
      inventory: {
        posts: {
          total: numero(contenido[0]?.total),
          published: numero(contenido[0]?.published),
          drafts: numero(contenido[0]?.drafts),
          publishedWithoutCover: numero(contenido[0]?.withoutCover),
        },
        talents: {
          total: numero(talento[0]?.total),
          published: numero(talento[0]?.published),
          publishedMissingSeoFields: numero(talento[0]?.missingSeo),
          publishedWithStaleMetrics: numero(talento[0]?.staleMetrics),
        },
        caseStudies: {
          total: numero(casos[0]?.total),
          published: numero(casos[0]?.published),
        },
      },
    };
  },
});

export const OPERATION_AGENT_TOOLS: readonly ErasedAgentTool[] = [
  getOperationalCampaignSummaryTool,
  getDealDraftQueueTool,
  getInboundLeadQueueTool,
  getSeoOperationsSnapshotTool,
];
