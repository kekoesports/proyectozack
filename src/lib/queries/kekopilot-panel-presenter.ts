import type { contracts, deliverables, invoices } from '@/db/schema';
import type { DealDetailData, InboxItem } from '@/features/kekopilot-panel/data';
import type { AgentRunListItem, PendingApprovalItem } from '@/lib/queries/agents/admin';
import type { UrgentTask } from '@/lib/queries/dashboard';

export type PanelCampaignRecord = {
  readonly id: number;
  readonly name: string;
  readonly status: 'propuesta' | 'negociacion' | 'aprobada' | 'activa' | 'completada' | 'cancelada' | 'pendiente_pago' | 'pagada';
  readonly deliveryDeadline: string | null;
  readonly trackingSheetUrl: string | null;
  readonly lastTrackingSyncAt: Date | null;
  readonly lastEvidenceAddedAt: Date | null;
  readonly trackingSyncError: string | null;
  readonly trackingAlertLevel: number;
  readonly updatedAt: Date;
  readonly ownerName: string | null;
};

const ACTIVE_STATUSES = new Set(['propuesta', 'negociacion', 'aprobada', 'activa']);
const DAY_MS = 24 * 60 * 60 * 1000;
const POSITIVE_INTEGER = /^\d+$/;

function formatMoney(value: string | number, currency = 'EUR'): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: Date | string | null): string {
  if (!value) return 'Sin fecha';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' }).format(date);
}

function relativeDate(value: Date | string | null, now: Date): string {
  if (!value) return 'Sin fecha';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  const days = Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  return days > 0 ? `${days} d` : `Hace ${Math.abs(days)} d`;
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isStale(row: PanelCampaignRecord, now: Date): boolean {
  if (!row.trackingSheetUrl || !ACTIVE_STATUSES.has(row.status)) return false;
  const lastActivity = row.lastEvidenceAddedAt ?? row.lastTrackingSyncAt ?? row.updatedAt;
  return now.getTime() - new Date(lastActivity).getTime() > 7 * DAY_MS;
}

function isBlocked(row: PanelCampaignRecord, now: Date): boolean {
  return Boolean(row.trackingSyncError) || row.trackingAlertLevel >= 70 || isStale(row, now);
}

function campaignIdFromApproval(approval: PendingApprovalItem): number | null {
  for (const key of ['campaignId', 'dealId']) {
    const value = approval.parametersPreviewJson[key];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
    if (typeof value === 'string' && POSITIVE_INTEGER.test(value)) return Number(value);
  }
  return null;
}

function stageFor(status: PanelCampaignRecord['status']): string {
  if (status === 'propuesta') return 'Propuesta';
  if (status === 'negociacion') return 'Negociación';
  if (status === 'aprobada') return 'Aprobada';
  if (status === 'activa') return 'En ejecución';
  return 'Cierre y cobro';
}

function statusLabel(status: PanelCampaignRecord['status']): string {
  const labels: Record<PanelCampaignRecord['status'], string> = {
    propuesta: 'Propuesta', negociacion: 'Negociación', aprobada: 'Aprobada', activa: 'Activa',
    completada: 'Completada', cancelada: 'Cancelada', pendiente_pago: 'Pendiente de pago', pagada: 'Pagada',
  };
  return labels[status];
}

export function buildPanelInbox(
  campaignRows: readonly PanelCampaignRecord[],
  approvals: readonly PendingApprovalItem[],
  urgentTasks: readonly UrgentTask[],
  failedRuns: readonly AgentRunListItem[],
  now: Date,
  workspaceName: string,
  referencePrefix: string,
): InboxItem[] {
  const approvalItems: InboxItem[] = approvals.map((item) => ({
    id: `approval-${item.id}`,
    priority: item.riskLevel === 'critical' || item.riskLevel === 'high' ? 1 : 2,
    state: 'Pendiente aprobación', tone: 'attention', title: item.title,
    body: item.summary || 'Una acción de agente espera revisión humana.',
    evidence: `${item.agentSlug} · ${item.toolName} ${item.toolVersion}`,
    owner: item.agentSlug, due: relativeDate(item.expiresAt, now), action: 'Revisar',
    href: '/admin/agents/approvals', category: 'Aprobaciones',
  }));

  const blockedItems: InboxItem[] = campaignRows.filter((row) => isBlocked(row, now)).slice(0, 8).map((row) => ({
    id: `campaign-${row.id}`,
    priority: row.trackingSyncError || row.trackingAlertLevel >= 100 ? 1 : 2,
    state: row.trackingSyncError ? 'Error' : 'Bloqueado', tone: 'danger',
    title: `${row.name} · ${referencePrefix}-${row.id}`,
    body: row.trackingSyncError ?? 'La hoja de seguimiento no registra actividad reciente.',
    evidence: `${workspaceName} CRM · última actividad ${formatDate(row.lastEvidenceAddedAt ?? row.lastTrackingSyncAt ?? row.updatedAt)}`,
    owner: row.ownerName ?? 'Sin asignar',
    due: row.deliveryDeadline ? relativeDate(row.deliveryDeadline, now) : 'Revisar',
    action: 'Abrir deal', href: `/admin/campanas/${row.id}`,
    category: row.trackingSyncError ? 'Errores' : 'Bloqueos',
  }));

  const taskItems: InboxItem[] = urgentTasks.map((task) => ({
    id: `task-${task.id}`, priority: task.priority === 'alta' ? 1 : task.priority === 'media' ? 2 : 3,
    state: 'Tarea vencida', tone: 'draft', title: task.title,
    body: `Tarea abierta en ${workspaceName} que requiere seguimiento.`, evidence: `Tareas · prioridad ${task.priority}`,
    owner: task.ownerName ?? 'Sin asignar', due: relativeDate(task.dueDate, now),
    action: 'Ver tarea', href: '/admin/tareas', category: 'Bloqueos',
  }));

  const runItems: InboxItem[] = failedRuns.slice(0, 5).map((run) => ({
    id: `run-${run.id}`, priority: run.status === 'dead_letter' ? 1 : 2,
    state: 'Error', tone: 'danger', title: `${run.agentName} · ejecución ${run.id}`,
    body: run.lastErrorMessage || 'La ejecución terminó sin completar su objetivo.',
    evidence: run.lastErrorCode ?? run.status, owner: run.agentSlug,
    due: relativeDate(run.completedAt ?? run.updatedAt, now), action: 'Ver ejecución',
    href: `/admin/agents/runs/${run.id}`, category: 'Errores',
  }));

  return [...approvalItems, ...blockedItems, ...taskItems, ...runItems]
    .toSorted((a, b) => a.priority - b.priority)
    .slice(0, 20);
}

function deliverableLabel(status: (typeof deliverables.$inferSelect)['status']): string {
  const labels: Record<(typeof deliverables.$inferSelect)['status'], string> = {
    pending_submission: 'Pendiente', submitted: 'Enviado', internal_review: 'Revisión interna',
    brand_review: 'Revisión de marca', approved: 'Aprobado', revision_requested: 'Cambios solicitados', rejected: 'Rechazado',
  };
  return labels[status];
}

export function buildDealDetails(
  campaignRows: readonly PanelCampaignRecord[],
  cards: ReadonlyMap<number, DealDetailData['deal']>,
  deliverableRows: readonly (typeof deliverables.$inferSelect)[],
  invoiceRows: readonly (typeof invoices.$inferSelect)[],
  contractRows: readonly (typeof contracts.$inferSelect)[],
  approvals: readonly PendingApprovalItem[],
  now: Date,
  workspaceName: string,
  referencePrefix: string,
): Record<string, DealDetailData> {
  const result: Record<string, DealDetailData> = {};
  for (const row of campaignRows) {
    const card = cards.get(row.id);
    if (!card) continue;
    const relatedApprovals = approvals.filter((approval) => campaignIdFromApproval(approval) === row.id);
    const campaignDeliverables = deliverableRows.filter((item) => item.campaignId === row.id);
    const campaignInvoices = invoiceRows.filter((item) => item.campaignId === row.id);
    const campaignContracts = contractRows.filter((item) => item.campaignId === row.id);
    const trackingHref = safeHttpUrl(row.trackingSheetUrl) ?? `/admin/campanas/${row.id}`;

    const documents: DealDetailData['documents'] = [
      ...(row.trackingSheetUrl ? [{
        id: `tracking-${row.id}`, title: 'Hoja de seguimiento',
        meta: row.lastTrackingSyncAt ? `Sincronizada ${formatDate(row.lastTrackingSyncAt)}` : 'Pendiente de primera sincronización',
        state: row.trackingSyncError ? 'Error' : isStale(row, now) ? 'Estancada' : 'Conectada',
        href: trackingHref, attention: Boolean(row.trackingSyncError) || isStale(row, now),
      }] : []),
      ...campaignContracts.map((contract) => ({
        id: `contract-${contract.id}`, title: contract.fileName || `Contrato ${contract.id}`,
        meta: `Actualizado ${formatDate(contract.updatedAt)}`,
        state: contract.status === 'signed' ? 'Firmado' : contract.status === 'pending_signature' ? 'Pendiente de firma' : 'Borrador',
        href: `/admin/campanas/${row.id}`, attention: contract.status !== 'signed',
      })),
      ...campaignInvoices.map((invoice) => ({
        id: `invoice-${invoice.id}`, title: invoice.number ? `Factura ${invoice.number}` : `Factura #${invoice.id}`,
        meta: `${invoice.concept} · ${formatMoney(invoice.totalAmount, invoice.currency)}`,
        state: invoice.status.replaceAll('_', ' '), href: '/admin/facturacion',
        attention: ['borrador', 'vencida', 'no_cobrada', 'no_pagada', 'pendiente'].includes(invoice.status),
      })),
    ];

    const alerts: DealDetailData['alerts'] = [
      ...(row.trackingSyncError ? [{ id: `sync-${row.id}`, title: 'Error de sincronización', body: row.trackingSyncError, tone: 'danger' as const }] : []),
      ...(isStale(row, now) ? [{ id: `stale-${row.id}`, title: 'Seguimiento estancado', body: 'La hoja conectada lleva más de siete días sin actividad.', tone: 'attention' as const }] : []),
      ...relatedApprovals.map((approval) => ({ id: `approval-${approval.id}`, title: approval.title, body: approval.summary, tone: 'attention' as const })),
    ];

    const activity: DealDetailData['activity'] = [
      ...relatedApprovals.map((approval) => ({
        id: `approval-${approval.id}`, kind: 'Pendiente', tone: 'attention' as const,
        source: approval.agentSlug, when: formatDate(approval.requestedAt), text: approval.summary || approval.title,
        evidence: `${approval.toolName} ${approval.toolVersion}`,
      })),
      ...(row.lastTrackingSyncAt ? [{
        id: `tracking-${row.id}`, kind: row.trackingSyncError ? 'Error' : 'Información',
        tone: row.trackingSyncError ? 'danger' as const : 'neutral' as const,
        source: `${workspaceName} Tracking`, when: formatDate(row.lastTrackingSyncAt),
        text: row.trackingSyncError || 'La hoja de seguimiento se sincronizó correctamente.',
        evidence: 'campaigns.last_tracking_sync_at',
      }] : []),
      {
        id: `crm-${row.id}`, kind: 'Información', tone: 'neutral', source: `${workspaceName} CRM`,
        when: formatDate(row.updatedAt), text: `El deal está en estado ${statusLabel(row.status).toLowerCase()}.`,
        evidence: `campaigns · ${referencePrefix}-${row.id}`,
      },
    ];

    result[String(row.id)] = {
      deal: card, stage: stageFor(row.status), crmHref: `/admin/campanas/${row.id}`,
      deliverables: campaignDeliverables.map((item) => ({
        id: String(item.id), title: item.title,
        body: `${item.type.replaceAll('_', ' ')}${item.contentUrl ? ' · contenido vinculado' : ''}`,
        date: formatDate(item.dueDate ?? item.updatedAt), state: deliverableLabel(item.status), done: item.status === 'approved',
      })),
      documents, alerts, activity,
    };
  }
  return result;
}
