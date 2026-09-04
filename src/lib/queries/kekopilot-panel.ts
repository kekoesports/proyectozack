import 'server-only';

import { and, desc, eq, inArray, isNull, notInArray, or } from 'drizzle-orm';

import {
  campaigns,
  contracts,
  crmBrands,
  deliverables,
  invoices,
  talents,
  user,
} from '@/db/schema';
import type { Role } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { hasPermission, needsVisibilityFilter } from '@/lib/permissions';
import { getUrgentTasks } from '@/lib/queries/dashboard';
import {
  listAgentsWithActivity,
  listAgentRunsForAdmin,
  listPendingApprovalsForAdmin,
} from '@/lib/queries/agents/admin';
import type {
  DealCard,
  DealStage,
  KekoPilotPanelConfig,
  KekoPilotPanelData,
  SidePanel,
  Tone,
} from '@/features/kekopilot-panel/data';
import { buildDealDetails, buildPanelInbox } from '@/lib/queries/kekopilot-panel-presenter';

type PanelSession = {
  readonly userId: string;
  readonly name: string;
  readonly role: Role;
};

type CampaignRow = Awaited<ReturnType<typeof loadCampaigns>>[number];
type ApprovalRow = Awaited<ReturnType<typeof listPendingApprovalsForAdmin>>[number];

const ACTIVE_STATUSES = new Set<CampaignRow['status']>(['propuesta', 'negociacion', 'aprobada', 'activa']);
const CLOSED_STATUSES = new Set<CampaignRow['status']>(['completada', 'pendiente_pago', 'pagada']);
const DAY_MS = 24 * 60 * 60 * 1000;
const POSITIVE_INTEGER = /^\d+$/;

const STAGE_ORDER = [
  'Propuesta',
  'Negociación',
  'Aprobada',
  'En ejecución',
  'Cierre y cobro',
] as const;

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'SP';
}

function formatMoney(value: string | number, currency = 'EUR'): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function stageFor(status: CampaignRow['status']): typeof STAGE_ORDER[number] {
  if (status === 'propuesta') return 'Propuesta';
  if (status === 'negociacion') return 'Negociación';
  if (status === 'aprobada') return 'Aprobada';
  if (status === 'activa') return 'En ejecución';
  return 'Cierre y cobro';
}

function statusLabel(status: CampaignRow['status']): string {
  const labels: Record<CampaignRow['status'], string> = {
    propuesta: 'Propuesta',
    negociacion: 'Negociación',
    aprobada: 'Aprobada',
    activa: 'Activa',
    completada: 'Completada',
    cancelada: 'Cancelada',
    pendiente_pago: 'Pendiente de pago',
    pagada: 'Pagada',
  };
  return labels[status];
}

function marginFor(row: CampaignRow): string {
  const brand = Number(row.amountBrand);
  const talent = Number(row.amountTalent);
  if (brand <= 0) return '—';
  return `${Math.round(((brand - talent) / brand) * 100)}%`;
}

function isStale(row: CampaignRow, now: Date): boolean {
  if (!row.trackingSheetUrl || !ACTIVE_STATUSES.has(row.status)) return false;
  const lastActivity = row.lastEvidenceAddedAt ?? row.lastTrackingSyncAt ?? row.updatedAt;
  return now.getTime() - new Date(lastActivity).getTime() > 7 * DAY_MS;
}

function isBlocked(row: CampaignRow, now: Date): boolean {
  return Boolean(row.trackingSyncError) || row.trackingAlertLevel >= 70 || isStale(row, now);
}

function campaignIdFromApproval(approval: ApprovalRow): number | null {
  const preview = approval.parametersPreviewJson;
  for (const key of ['campaignId', 'dealId']) {
    const value = preview[key];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
    if (typeof value === 'string' && POSITIVE_INTEGER.test(value)) return Number(value);
  }
  return null;
}

async function loadCampaigns(session: PanelSession) {
  const visibility = needsVisibilityFilter(session.role)
    ? or(
        eq(campaigns.assignedToUserId, session.userId),
        eq(campaigns.createdByUserId, session.userId),
        eq(campaigns.responsibleUserId, session.userId),
      )
    : undefined;

  return db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      amountBrand: campaigns.amountBrand,
      amountTalent: campaigns.amountTalent,
      currency: campaigns.currency,
      deliveryDeadline: campaigns.deliveryDeadline,
      responsibleUserId: campaigns.responsibleUserId,
      assignedToUserId: campaigns.assignedToUserId,
      createdByUserId: campaigns.createdByUserId,
      trackingSheetUrl: campaigns.trackingSheetUrl,
      lastTrackingSyncAt: campaigns.lastTrackingSyncAt,
      lastEvidenceAddedAt: campaigns.lastEvidenceAddedAt,
      trackingSyncError: campaigns.trackingSyncError,
      trackingAlertLevel: campaigns.trackingAlertLevel,
      updatedAt: campaigns.updatedAt,
      brandName: crmBrands.name,
      talentName: talents.name,
      ownerName: user.name,
    })
    .from(campaigns)
    .innerJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
    .innerJoin(talents, eq(talents.id, campaigns.talentId))
    .leftJoin(user, eq(user.id, campaigns.responsibleUserId))
    .where(and(
      isNull(campaigns.archivedAt),
      notInArray(campaigns.status, ['cancelada']),
      visibility,
    ))
    .orderBy(desc(campaigns.updatedAt))
    .limit(80);
}

function dealAlert(row: CampaignRow, approval: boolean, now: Date): string {
  if (row.trackingSyncError) return 'Error de sincronización';
  if (row.trackingAlertLevel >= 100) return 'Sin avance durante 14 días';
  if (row.trackingAlertLevel >= 70 || isStale(row, now)) return 'Seguimiento sin actualizar';
  if (approval) return 'Requiere aprobación';
  if (row.deliveryDeadline && new Date(row.deliveryDeadline).getTime() < now.getTime()) return 'Entrega vencida';
  return 'Al día';
}

function progressFor(row: CampaignRow, completed: number, total: number): number {
  if (row.status === 'pagada' || row.status === 'completada') return 100;
  if (row.status === 'pendiente_pago') return 92;
  if (row.status === 'activa') {
    const ratio = total > 0 ? completed / total : 0;
    return Math.round(60 + ratio * 28);
  }
  if (row.status === 'aprobada') return 52;
  if (row.status === 'negociacion') return 36;
  return 18;
}

function buildCard(
  row: CampaignRow,
  session: PanelSession,
  referencePrefix: string,
  approvalCampaignIds: ReadonlySet<number>,
  deliverableCounts: ReadonlyMap<number, { readonly total: number; readonly completed: number }>,
  now: Date,
): DealCard {
  const blocked = isBlocked(row, now);
  const approval = approvalCampaignIds.has(row.id);
  const closed = CLOSED_STATUSES.has(row.status);
  const counts = deliverableCounts.get(row.id) ?? { total: 0, completed: 0 };
  const tone: Tone = blocked ? 'danger' : approval ? 'attention' : closed ? 'neutral' : 'success';

  return {
    id: String(row.id),
    ref: `${referencePrefix}-${row.id}`,
    name: row.name,
    creator: row.talentName,
    brand: row.brandName,
    state: blocked ? 'Bloqueada' : statusLabel(row.status),
    tone,
    amount: formatMoney(row.amountBrand, row.currency),
    margin: marginFor(row),
    owner: initials(row.ownerName ?? 'Sin asignar'),
    progress: progressFor(row, counts.completed, counts.total),
    alert: dealAlert(row, approval, now),
    flags: {
      mine: [row.responsibleUserId, row.assignedToUserId, row.createdByUserId].includes(session.userId),
      blocked,
      approval,
      closed,
    },
  };
}

function buildStages(rows: readonly CampaignRow[], cards: ReadonlyMap<number, DealCard>): DealStage[] {
  return STAGE_ORDER.map((stage) => {
    const stageRows = rows.filter((row) => stageFor(row.status) === stage);
    const deals = stageRows.flatMap((row) => {
      const card = cards.get(row.id);
      return card ? [card] : [];
    });
    const eurTotal = stageRows
      .filter((row) => row.currency === 'EUR')
      .reduce((sum, row) => sum + Number(row.amountBrand), 0);
    return { name: stage, total: formatMoney(eurTotal), deals };
  });
}

export async function getKekoPilotPanelData(
  session: PanelSession,
  config: KekoPilotPanelConfig,
): Promise<KekoPilotPanelData> {
  const now = new Date();
  const canReadTasks = hasPermission(session.role, 'tareas', 'read');
  const canReadFinance = hasPermission(session.role, 'facturacion', 'read');
  const canReadContracts = hasPermission(session.role, 'contratos', 'read');
  const canReadAgents = hasPermission(session.role, 'agents', 'read');
  const canApproveAgents = hasPermission(session.role, 'agents', 'approve');

  const [campaignRows, urgentTasks, approvals, agentActivity, recentRuns] = await Promise.all([
    loadCampaigns(session),
    canReadTasks ? getUrgentTasks(10, { userId: session.userId, role: session.role }) : Promise.resolve([]),
    canApproveAgents ? listPendingApprovalsForAdmin(30) : Promise.resolve([]),
    canReadAgents ? listAgentsWithActivity(now) : Promise.resolve([]),
    canReadAgents ? listAgentRunsForAdmin({ limit: 40 }) : Promise.resolve([]),
  ]);

  const campaignIds = campaignRows.map((row) => row.id);
  const [deliverableRows, invoiceRows, contractRows] = campaignIds.length === 0
    ? [[], [], []]
    : await Promise.all([
        db.select().from(deliverables).where(inArray(deliverables.campaignId, campaignIds)).orderBy(desc(deliverables.updatedAt)),
        canReadFinance
          ? db.select().from(invoices).where(inArray(invoices.campaignId, campaignIds)).orderBy(desc(invoices.updatedAt))
          : Promise.resolve([]),
        canReadContracts
          ? db.select().from(contracts).where(inArray(contracts.campaignId, campaignIds)).orderBy(desc(contracts.updatedAt))
          : Promise.resolve([]),
      ]);

  const approvalCampaignIds = new Set(approvals.flatMap((item) => {
    const id = campaignIdFromApproval(item);
    return id ? [id] : [];
  }));
  const deliverableCounts = new Map<number, { total: number; completed: number }>();
  for (const item of deliverableRows) {
    const current = deliverableCounts.get(item.campaignId) ?? { total: 0, completed: 0 };
    deliverableCounts.set(item.campaignId, {
      total: current.total + 1,
      completed: current.completed + (item.status === 'approved' ? 1 : 0),
    });
  }

  const cards = new Map(campaignRows.map((row) => [
    row.id,
    buildCard(row, session, config.branding.referencePrefix, approvalCampaignIds, deliverableCounts, now),
  ]));
  const blockedRows = campaignRows.filter((row) => isBlocked(row, now));
  const staleRows = campaignRows.filter((row) => isStale(row, now));
  const failedRuns = recentRuns.filter((run) =>
    (run.status === 'failed' || run.status === 'dead_letter') &&
    now.getTime() - new Date(run.createdAt).getTime() <= DAY_MS,
  );
  const inbox = buildPanelInbox(
    campaignRows,
    approvals,
    urgentTasks,
    failedRuns,
    now,
    config.workspace.name,
    config.branding.referencePrefix,
  );
  const activeRows = campaignRows.filter((row) => ACTIVE_STATUSES.has(row.status));
  const eurRows = campaignRows.filter((row) => row.currency === 'EUR');
  const eurTotal = eurRows.reduce((sum, row) => sum + Number(row.amountBrand), 0);
  const totalBrand = eurRows.reduce((sum, row) => sum + Number(row.amountBrand), 0);
  const totalMargin = eurRows.reduce((sum, row) => sum + Number(row.amountBrand) - Number(row.amountTalent), 0);
  const averageMargin = totalBrand > 0 ? `${Math.round((totalMargin / totalBrand) * 100)}%` : '—';
  const syncedRows = campaignRows.filter((row) => row.trackingSheetUrl && !row.trackingSyncError && !isStale(row, now));
  const generatedAt = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit',
  }).format(now);

  const sidePanels: SidePanel[] = [
    {
      title: 'Actividad de agentes',
      meta: canApproveAgents ? `${approvals.length} por revisar` : 'según tus permisos',
      rows: agentActivity.length > 0
        ? agentActivity.slice(0, 4).map((agent) => ({
            title: agent.displayName,
            body: `${agent.runsLast7Days} ejecuciones en 7 días · ${agent.failedLast7Days} con error`,
            value: String(agent.pendingApprovals),
            tone: agent.failedLast7Days > 0 ? 'danger' : agent.pendingApprovals > 0 ? 'attention' : 'success',
            href: `/admin/agents`,
          }))
        : [{
            title: canReadAgents ? 'Sin actividad reciente' : 'Acceso restringido',
            body: canReadAgents ? 'No hay ejecuciones registradas.' : `El detalle de agentes depende del rol de ${config.workspace.name}.`,
            value: '—', tone: 'neutral',
          }],
    },
    {
      title: 'Estado del seguimiento',
      meta: 'deals con hoja conectada',
      rows: [
        { title: 'Al día', body: 'Seguimiento sincronizado y con actividad reciente', value: String(syncedRows.length), tone: 'success', href: '/admin/campanas' },
        { title: 'Sin actividad', body: 'Más de 7 días sin cambios', value: String(staleRows.length), tone: staleRows.length > 0 ? 'attention' : 'neutral', href: '/admin/campanas' },
        { title: 'Con incidencia', body: 'Conexión o formato pendientes de revisión', value: String(campaignRows.filter((row) => row.trackingSyncError).length), tone: campaignRows.some((row) => row.trackingSyncError) ? 'danger' : 'success', href: '/admin/campanas' },
      ],
    },
    {
      title: 'Carga de trabajo',
      meta: config.workspace.name,
      rows: [
        { title: 'Deals activos', body: 'Propuesta, negociación, aprobada o activa', value: String(activeRows.length), tone: 'neutral', href: '/admin/campanas' },
        { title: 'Tareas urgentes', body: 'Abiertas y vencidas', value: String(urgentTasks.length), tone: urgentTasks.length > 0 ? 'attention' : 'success', href: '/admin/tareas' },
        { title: 'Última actualización', body: 'CRM, tareas y agentes', value: generatedAt, tone: 'success' },
      ],
    },
  ];

  return {
    branding: config.branding,
    workspace: config.workspace,
    user: { name: session.name, role: session.role, initials: initials(session.name) },
    generatedAt,
    counts: {
      approvals: approvals.length,
      deals: campaignRows.length,
      tasks: urgentTasks.length,
      agents: agentActivity.filter((agent) => agent.status === 'active').length,
    },
    metrics: [
      { label: 'Pendiente de aprobación', value: String(approvals.length), note: canApproveAgents ? 'acciones por revisar' : 'según tus permisos', tone: approvals.length > 0 ? 'attention' : 'neutral' },
      { label: 'Deals con incidencias', value: String(blockedRows.length), note: 'errores o seguimiento detenido', tone: blockedRows.length > 0 ? 'danger' : 'success' },
      { label: 'Seguimientos sin actividad', value: String(staleRows.length), note: 'más de 7 días sin cambios', tone: staleRows.length > 0 ? 'attention' : 'neutral' },
      { label: 'Ejecuciones fallidas', value: String(failedRuns.length), note: 'agentes · últimas 24 horas', tone: failedRuns.length > 0 ? 'danger' : 'success' },
    ],
    inbox,
    sidePanels,
    pipeline: {
      total: formatMoney(eurTotal),
      averageMargin,
      blocked: blockedRows.length,
      stages: buildStages(campaignRows, cards),
    },
    dealDetails: buildDealDetails(
      campaignRows,
      cards,
      deliverableRows,
      invoiceRows,
      contractRows,
      approvals,
      now,
      config.workspace.name,
      config.branding.referencePrefix,
    ),
  };
}
