import { and, asc, desc, eq, inArray, isNull, isNotNull, lt, not, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { alerts, crmTasks, crmBrandFollowups, crmBrands, campaigns, talents, invoices, issuedInvoices, billingClients } from '@/db/schema';
import { getIsoWeekLabel, previousWeek } from '@/lib/utils/week';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType =
  | 'overdue_task'
  | 'overdue_followup'
  | 'unpaid_brand'
  | 'pending_talent'
  | 'expiring_deal'
  | 'expired_active'
  | 'task_due_today_high'
  | 'task_rolled_over'
  | 'invoice_overdue'
  | 'deal_brand_paid_talent_pending'
  | 'issued_invoice_overdue'
  | 'issued_invoice_due_soon'
  | 'task_assigned'
  | 'task_completed'
  | 'meeting_invited';

export type AlertResolveHint = {
  readonly type:   'complete_task';
  readonly taskId: number;
};

export type DashboardAlert = {
  readonly id:           string;
  readonly type:         AlertType;
  readonly severity:     AlertSeverity;
  readonly title:        string;
  readonly description:  string;
  readonly href:         string;
  readonly amount?:      number | undefined;
  readonly daysInfo?:    string | undefined;
  /** Datos para resolver la alerta en un clic (solo tareas). */
  readonly resolveHint?: AlertResolveHint | undefined;
  /** ID de la fila en crm_alerts para notificaciones persistentes dismissibles. */
  readonly dbId?:        number | undefined;
};

export type AlertSummary = {
  readonly overdueTasksCount:    number;
  readonly overdueFollowupsCount: number;
  readonly unpaidBrandCount:     number;
  readonly pendingTalentCount:   number;
  readonly expiringDealsCount:   number;
  readonly total:                number;
};

// ── Helpers ───────────────────────────────────────────────────────────

function todayMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function daysOverdueStr(dateStr: string): { days: number; label: string } {
  const today = new Date(todayMadrid() + 'T00:00:00');
  const due   = new Date(dateStr + 'T00:00:00');
  const days  = Math.round((today.getTime() - due.getTime()) / 86_400_000);
  if (days === 0) return { days: 0, label: 'Vence hoy' };
  if (days === 1) return { days: 1, label: 'Vencida ayer' };
  if (days > 0)   return { days, label: `Hace ${days} días` };
  const rem = Math.abs(days);
  return { days, label: rem === 1 ? 'Mañana' : `En ${rem} días` };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

// ── Mutations ────────────────────────────────────────────────────────

/** Inserta una notificación persistente en crm_alerts. */
export async function createAlert(data: {
  readonly type:              AlertType;
  readonly title:             string;
  readonly description?:      string;
  readonly severity?:         AlertSeverity;
  readonly assignedToUserId?: string;
  readonly relatedEntityType?: string;
  readonly relatedEntityId?:  number;
}): Promise<void> {
  await db.insert(alerts).values({
    type:              data.type,
    title:             data.title,
    description:       data.description ?? null,
    severity:          data.severity ?? 'low',
    status:            'active',
    assignedToUserId:  data.assignedToUserId ?? null,
    relatedEntityType: data.relatedEntityType ?? null,
    relatedEntityId:   data.relatedEntityId ?? null,
  });
}

export type TrackerCompletedAlert = {
  readonly id: number;
  readonly title: string;
  readonly description: string | null;
  readonly relatedEntityId: number | null;
};

/** Devuelve las alertas de tracker completado activas (para el pop-up de confirmación). */
export async function getActiveTrackerCompletedAlerts(): Promise<TrackerCompletedAlert[]> {
  return db
    .select({
      id: alerts.id,
      title: alerts.title,
      description: alerts.description,
      relatedEntityId: alerts.relatedEntityId,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.type, 'deal_tracker_complete'),
        eq(alerts.status, 'active'),
      ),
    )
    .orderBy(asc(alerts.triggeredAt));
}

/** Marca una alerta de tracker completado como dismissed (sin restricción de usuario). */
export async function dismissTrackerCompletedAlert(id: number): Promise<void> {
  await db
    .update(alerts)
    .set({ status: 'dismissed', dismissedAt: new Date(), updatedAt: new Date() })
    .where(eq(alerts.id, id));
}

/** Marca una alerta persistente como dismissed. Solo afecta alertas asignadas al usuario. */
export async function dismissAlert(id: number, userId: string): Promise<void> {
  await db
    .update(alerts)
    .set({ status: 'dismissed', dismissedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(alerts.id, id), eq(alerts.assignedToUserId, userId)));
}

/** Dismiss de todas las notificaciones personales no leídas de un usuario. */
export async function dismissAllPersonalAlerts(userId: string): Promise<void> {
  await db
    .update(alerts)
    .set({ status: 'dismissed', dismissedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(alerts.assignedToUserId, userId),
        eq(alerts.status, 'active'),
        inArray(alerts.type, ['task_assigned', 'task_completed'] as const),
      ),
    );
}

// ── Main query ────────────────────────────────────────────────────────

export async function getDashboardAlerts(opts?: {
  /** Si se pasa, filtra alertas de tareas y followups para este usuario (staff) */
  readonly staffUserId?: string;
  /** Si true, omite alertas financieras globales (para staff sin acceso financiero) */
  readonly skipFinancial?: boolean;
  /** Usuario actual — para cargar notificaciones personales persistentes */
  readonly currentUserId?: string;
}): Promise<{
  alerts:  readonly DashboardAlert[];
  summary: AlertSummary;
}> {
  const staffUserId    = opts?.staffUserId;
  const skipFinancial  = opts?.skipFinancial ?? false;
  const currentUserId  = opts?.currentUserId;
  const today    = todayMadrid();
  const in7days  = new Date(Date.now() + 7  * 86_400_000).toISOString().slice(0, 10);
  const _in3days  = new Date(Date.now() + 3  * 86_400_000).toISOString().slice(0, 10);

  const _twoWeeksAgoLabel = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d).replace(/-/g, '') as string;
  })();
  const prevWeekLabel = previousWeek(getIsoWeekLabel(new Date()));

  const [
    overdueTasks,
    overdueFollowups,
    unpaidBrand,
    pendingTalent,
    expiringDeals,
    expiredActive,
    tasksDueToday,
    rolledOverOld,
    overdueInvoices,
    brandPaidTalentPending,
    overdueIssuedInvoices,
    dueSoonIssuedInvoices,
    persistentNotifs,
  ] = await Promise.all([
    // 1. Tareas vencidas (max 3) — filtradas por staffUserId si aplica
    db.select({
      id: crmTasks.id, title: crmTasks.title,
      priority: crmTasks.priority, category: crmTasks.category, dueDate: crmTasks.dueDate,
    }).from(crmTasks)
      .where(and(
        not(eq(crmTasks.status, 'completada')),
        isNotNull(crmTasks.dueDate),
        sql`${crmTasks.dueDate}::date < ${today}::date`,
        staffUserId
          ? or(eq(crmTasks.assignedToUserId, staffUserId), eq(crmTasks.ownerId, staffUserId))
          : undefined,
      ))
      .orderBy(asc(crmTasks.dueDate))
      .limit(3),

    // 2. Follow-ups vencidos (max 3) — staff ve solo los suyos
    db.select({
      id: crmBrandFollowups.id, note: crmBrandFollowups.note,
      scheduledAt: crmBrandFollowups.scheduledAt,
      brandId: crmBrandFollowups.brandId, brandName: crmBrands.name,
    }).from(crmBrandFollowups)
      .innerJoin(crmBrands, eq(crmBrands.id, crmBrandFollowups.brandId))
      .where(and(
        isNull(crmBrandFollowups.completedAt),
        lt(crmBrandFollowups.scheduledAt, new Date()),
        staffUserId
          ? or(
              eq(crmBrandFollowups.assignedToUserId, staffUserId),
              eq(crmBrandFollowups.responsibleUserId, staffUserId),
            )
          : undefined,
      ))
      .orderBy(asc(crmBrandFollowups.scheduledAt))
      .limit(3),

    // 3. Cobros de marca pendientes (max 3) — campaigns where amountBrand > 0 and not cancelled/paid
    // brandPaid is derived from invoices, not a column. Use status as proxy.
    db.select({
      id: campaigns.id, name: campaigns.name, status: campaigns.status,
      amountBrand: campaigns.amountBrand,
      brandName: crmBrands.name, talentName: talents.name,
    }).from(campaigns)
      .leftJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .leftJoin(talents, eq(talents.id, campaigns.talentId))
      .where(and(
        sql`${campaigns.amountBrand} > 0`,
        not(eq(campaigns.status, 'cancelada')),
        not(eq(campaigns.status, 'pagada')),
      ))
      .orderBy(asc(campaigns.endDate))
      .limit(3),

    // 4. Pagos pendientes a talento (max 3)
    db.select({
      id: campaigns.id, name: campaigns.name,
      amountTalent: campaigns.amountTalent,
      brandName: crmBrands.name, talentName: talents.name,
    }).from(campaigns)
      .leftJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .leftJoin(talents, eq(talents.id, campaigns.talentId))
      .where(and(
        not(eq(campaigns.status, 'cancelada')),
        not(eq(campaigns.status, 'pagada')),
        sql`${campaigns.amountTalent} > 0`,
      ))
      .limit(3),

    // 5. Tratos que vencen en ≤7 días (max 3) — staff ve solo los suyos
    db.select({
      id: campaigns.id, name: campaigns.name, endDate: campaigns.endDate,
      brandName: crmBrands.name, talentName: talents.name,
    }).from(campaigns)
      .leftJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .leftJoin(talents, eq(talents.id, campaigns.talentId))
      .where(and(
        eq(campaigns.status, 'activa'),
        isNotNull(campaigns.endDate),
        sql`${campaigns.endDate}::date >= ${today}::date`,
        sql`${campaigns.endDate}::date <= ${in7days}::date`,
        staffUserId
          ? or(eq(campaigns.assignedToUserId, staffUserId), eq(campaigns.createdByUserId, staffUserId))
          : undefined,
      ))
      .orderBy(asc(campaigns.endDate))
      .limit(3),

    // 6. Tratos activos con fecha ya vencida (max 3) — staff ve solo los suyos
    db.select({
      id: campaigns.id, name: campaigns.name, endDate: campaigns.endDate,
      brandName: crmBrands.name, talentName: talents.name,
    }).from(campaigns)
      .leftJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .leftJoin(talents, eq(talents.id, campaigns.talentId))
      .where(and(
        eq(campaigns.status, 'activa'),
        isNotNull(campaigns.endDate),
        sql`${campaigns.endDate}::date < ${today}::date`,
        staffUserId
          ? or(eq(campaigns.assignedToUserId, staffUserId), eq(campaigns.createdByUserId, staffUserId))
          : undefined,
      ))
      .orderBy(asc(campaigns.endDate))
      .limit(3),

    // 7. Tareas de alta prioridad que vencen hoy (max 3)
    // 7. Tareas de alta prioridad que vencen hoy — staff ve solo las suyas
    db.select({
      id: crmTasks.id, title: crmTasks.title, category: crmTasks.category,
    }).from(crmTasks)
      .where(and(
        not(eq(crmTasks.status, 'completada')),
        eq(crmTasks.priority, 'alta'),
        isNotNull(crmTasks.dueDate),
        sql`${crmTasks.dueDate}::date = ${today}::date`,
        staffUserId
          ? or(eq(crmTasks.assignedToUserId, staffUserId), eq(crmTasks.ownerId, staffUserId))
          : undefined,
      ))
      .limit(3),

    // 8. Tareas arrastradas desde hace más de 1 semana — staff ve solo las suyas
    db.select({
      id: crmTasks.id, title: crmTasks.title,
      category: crmTasks.category, rolledFromWeek: crmTasks.rolledFromWeek,
    }).from(crmTasks)
      .where(and(
        not(eq(crmTasks.status, 'completada')),
        eq(crmTasks.rolledOver, true),
        isNotNull(crmTasks.rolledFromWeek),
        sql`${crmTasks.rolledFromWeek} < ${prevWeekLabel}`,
        staffUserId
          ? or(eq(crmTasks.assignedToUserId, staffUserId), eq(crmTasks.ownerId, staffUserId))
          : undefined,
      ))
      .orderBy(asc(crmTasks.rolledFromWeek))
      .limit(3),

    // 9. Facturas vencidas — pendiente/emitida con dueDate pasado (max 4)
    db.select({
      id:        invoices.id,
      concept:   invoices.concept,
      kind:      invoices.kind,
      dueDate:   invoices.dueDate,
      totalAmount: invoices.totalAmount,
      campaignId: invoices.campaignId,
    }).from(invoices)
      .where(and(
        inArray(invoices.status, ['pendiente', 'emitida', 'no_cobrada', 'no_cobrado', 'no_pagada', 'no_pagado']),
        isNotNull(invoices.dueDate),
        sql`${invoices.dueDate}::date < ${today}::date`,
        not(eq(invoices.status, 'anulada')),
      ))
      .orderBy(asc(invoices.dueDate))
      .limit(4),

    // 10. Tratos donde marca pagó (income cobrada) pero talento sigue sin pagar (max 3)
    db.select({
      id:          campaigns.id,
      name:        campaigns.name,
      talentName:  talents.name,
      brandName:   crmBrands.name,
      amountTalent: campaigns.amountTalent,
    }).from(campaigns)
      .leftJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .leftJoin(talents,   eq(talents.id,   campaigns.talentId))
      .where(and(
        not(eq(campaigns.status, 'cancelada')),
        not(eq(campaigns.status, 'pagada')),
        isNull(campaigns.archivedAt),
        sql`${campaigns.amountTalent} > 0`,
        // Has at least one cobrada income invoice
        sql`EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.campaign_id = ${campaigns.id}
            AND i.kind = 'income'
            AND i.status = 'cobrada'
        )`,
        // But NO pagada expense invoice
        sql`NOT EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.campaign_id = ${campaigns.id}
            AND i.kind = 'expense'
            AND i.status IN ('pagada', 'cobrada')
        )`,
      ))
      .limit(3),

    // 11. Facturas emitidas vencidas (dueDate pasado, status emitida/enviada)
    skipFinancial ? Promise.resolve([]) :
    db.select({
      id:            issuedInvoices.id,
      invoiceNumber: issuedInvoices.invoiceNumber,
      totalAmount:   issuedInvoices.totalAmount,
      currency:      issuedInvoices.currency,
      dueDate:       issuedInvoices.dueDate,
      relatedDealId: issuedInvoices.relatedDealId,
      clientName:    billingClients.name,
    })
    .from(issuedInvoices)
    .leftJoin(billingClients, eq(billingClients.id, issuedInvoices.billingClientId))
    .where(and(
      inArray(issuedInvoices.status, ['emitida', 'enviada']),
      isNotNull(issuedInvoices.dueDate),
      sql`${issuedInvoices.dueDate}::date < ${today}::date`,
    ))
    .orderBy(asc(issuedInvoices.dueDate))
    .limit(3),

    // 12. Facturas emitidas que vencen en ≤7 días (dueDate próximo)
    skipFinancial ? Promise.resolve([]) :
    db.select({
      id:            issuedInvoices.id,
      invoiceNumber: issuedInvoices.invoiceNumber,
      totalAmount:   issuedInvoices.totalAmount,
      currency:      issuedInvoices.currency,
      dueDate:       issuedInvoices.dueDate,
      relatedDealId: issuedInvoices.relatedDealId,
      clientName:    billingClients.name,
    })
    .from(issuedInvoices)
    .leftJoin(billingClients, eq(billingClients.id, issuedInvoices.billingClientId))
    .where(and(
      inArray(issuedInvoices.status, ['emitida', 'enviada']),
      isNotNull(issuedInvoices.dueDate),
      sql`${issuedInvoices.dueDate}::date >= ${today}::date`,
      sql`${issuedInvoices.dueDate}::date <= ${in7days}::date`,
    ))
    .orderBy(asc(issuedInvoices.dueDate))
    .limit(3),

    // 13. Notificaciones persistentes personales (task_assigned, task_completed)
    currentUserId
      ? db.select({
          id:          alerts.id,
          type:        alerts.type,
          title:       alerts.title,
          description: alerts.description,
          relatedEntityId: alerts.relatedEntityId,
          triggeredAt: alerts.triggeredAt,
        }).from(alerts)
          .where(and(
            eq(alerts.assignedToUserId, currentUserId),
            eq(alerts.status, 'active'),
            inArray(alerts.type, ['task_assigned', 'task_completed']),
          ))
          .orderBy(desc(alerts.triggeredAt))
          .limit(10)
      : Promise.resolve([]),
  ]);

  const items: DashboardAlert[] = [];

  // 1 → alertas de tareas vencidas
  for (const t of overdueTasks) {
    if (!t.dueDate) continue;
    const { days: _days, label } = daysOverdueStr(t.dueDate);
    items.push({
      id:           `overdue_task_${t.id}`,
      type:         'overdue_task',
      severity:     t.priority === 'alta' ? 'critical' : t.priority === 'media' ? 'high' : 'medium',
      title:        `Tarea vencida — ${t.title}`,
      description:  `${t.category}`,
      href:         '/admin/tareas',
      daysInfo:     label,
      resolveHint:  { type: 'complete_task', taskId: t.id },
    });
  }

  // 2 → follow-ups
  for (const f of overdueFollowups) {
    const dt = new Date(f.scheduledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    items.push({
      id:          `overdue_followup_${f.id}`,
      type:        'overdue_followup',
      severity:    'high',
      title:       `Follow-up vencido — ${f.brandName ?? 'Marca'}`,
      description: f.note.slice(0, 80),
      href:        `/admin/brands/${f.brandId}`,
      daysInfo:    `Programado el ${dt}`,
    });
  }

  // 3 → cobros pendientes (solo admin/manager)
  for (const c of (!skipFinancial ? unpaidBrand : [])) {
    const amount = Number(c.amountBrand ?? 0);
    const parts  = [c.brandName, c.talentName].filter(Boolean).join(' × ');
    items.push({
      id:          `unpaid_brand_${c.id}`,
      type:        'unpaid_brand',
      severity:    c.status === 'completada' ? 'high' : 'medium',
      title:       `Cobro pendiente${parts ? ` — ${parts}` : ''}`,
      description: `${fmt(amount)} sin cobrar`,
      href:        `/admin/campanas/${c.id}`,
      amount,
      daysInfo:    c.status === 'completada' ? 'Trato completado' : 'Trato activo',
    });
  }

  // 4 → pagos a talento (solo admin/manager)
  for (const c of (!skipFinancial ? pendingTalent : [])) {
    const amount = Number(c.amountTalent ?? 0);
    items.push({
      id:          `pending_talent_${c.id}`,
      type:        'pending_talent',
      severity:    'medium',
      title:       `Pago pendiente — ${c.talentName ?? 'Talento'}`,
      description: `${fmt(amount)} sin pagar · ${c.brandName ?? ''}`,
      href:        `/admin/campanas/${c.id}`,
      amount,
      daysInfo:    'Sin pagar',
    });
  }

  // 5 → tratos que vencen pronto
  for (const c of expiringDeals) {
    if (!c.endDate) continue;
    const { label } = daysOverdueStr(c.endDate);
    const parts = [c.brandName, c.talentName].filter(Boolean).join(' × ');
    const daysLeft = Math.round((new Date(c.endDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86_400_000);
    items.push({
      id:          `expiring_${c.id}`,
      type:        'expiring_deal',
      severity:    daysLeft <= 2 ? 'high' : 'medium',
      title:       `Trato vence pronto — ${parts || c.name}`,
      description: c.name,
      href:        `/admin/campanas/${c.id}`,
      daysInfo:    label,
    });
  }

  // 6 → tratos activos vencidos
  for (const c of expiredActive) {
    if (!c.endDate) continue;
    const { label } = daysOverdueStr(c.endDate);
    const parts = [c.brandName, c.talentName].filter(Boolean).join(' × ');
    items.push({
      id:          `expired_active_${c.id}`,
      type:        'expired_active',
      severity:    'high',
      title:       `Trato sin cerrar — ${parts || c.name}`,
      description: `Fecha de fin superada · ${c.name}`,
      href:        `/admin/campanas/${c.id}`,
      daysInfo:    label,
    });
  }

  // 7 → tareas de alta prioridad que vencen hoy
  for (const t of tasksDueToday) {
    items.push({
      id:          `task_due_today_${t.id}`,
      type:        'task_due_today_high',
      severity:    'critical',
      title:       `Vence hoy — ${t.title}`,
      description: `Prioridad alta · ${t.category}`,
      href:        '/admin/tareas',
      daysInfo:    'Hoy',
      resolveHint: { type: 'complete_task', taskId: t.id },
    });
  }

  // 8 → tareas arrastradas más de 1 semana
  for (const t of rolledOverOld) {
    items.push({
      id:          `task_rolled_${t.id}`,
      type:        'task_rolled_over',
      severity:    'medium',
      title:       `Tarea arrastrada — ${t.title}`,
      description: `${t.category} · desde ${t.rolledFromWeek ?? 'semana anterior'}`,
      href:        '/admin/tareas',
      daysInfo:    'Más de 1 semana',
      resolveHint: { type: 'complete_task', taskId: t.id },
    });
  }

  // 9 → facturas vencidas
  for (const inv of (!skipFinancial ? overdueInvoices : [])) {
    if (!inv.dueDate) continue;
    const { days, label } = daysOverdueStr(inv.dueDate);
    const kindLabel = inv.kind === 'income' ? 'Ingreso' : 'Gasto';
    items.push({
      id:          `invoice_overdue_${inv.id}`,
      type:        'invoice_overdue',
      severity:    days >= 14 ? 'critical' : days >= 7 ? 'high' : 'medium',
      title:       `${kindLabel} vencido — ${inv.concept}`,
      description: `${fmt(Number(inv.totalAmount))} sin ${inv.kind === 'income' ? 'cobrar' : 'pagar'}`,
      href:        inv.campaignId ? `/admin/campanas/${inv.campaignId}` : '/admin/facturacion',
      amount:      Number(inv.totalAmount),
      daysInfo:    label,
    });
  }

  // 10 → marca pagó pero talento pendiente
  for (const c of (!skipFinancial ? brandPaidTalentPending : [])) {
    const amount = Number(c.amountTalent ?? 0);
    const parts  = [c.brandName, c.talentName].filter(Boolean).join(' × ');
    items.push({
      id:          `brand_paid_talent_pending_${c.id}`,
      type:        'deal_brand_paid_talent_pending',
      severity:    'high',
      title:       `Marca pagó — talento pendiente: ${parts || c.name}`,
      description: `${fmt(amount)} aún sin pagar al creador`,
      href:        `/admin/campanas/${c.id}`,
      amount,
      daysInfo:    'Sin pagar',
    });
  }

  // 11 → facturas emitidas vencidas
  for (const inv of overdueIssuedInvoices) {
    if (!inv.dueDate) continue;
    const { days, label } = daysOverdueStr(inv.dueDate);
    items.push({
      id:          `issued_inv_overdue_${inv.id}`,
      type:        'issued_invoice_overdue',
      severity:    days >= 14 ? 'critical' : 'high',
      title:       `Factura vencida — ${inv.invoiceNumber}`,
      description: inv.clientName ? `Cliente: ${inv.clientName}` : 'Factura emitida sin cobrar',
      href:        '/admin/facturacion?tab=facturas',
      amount:      Number(inv.totalAmount),
      daysInfo:    label,
    });
  }

  // 12 → facturas emitidas próximas a vencer
  for (const inv of dueSoonIssuedInvoices) {
    if (!inv.dueDate) continue;
    const { label } = daysOverdueStr(inv.dueDate);
    items.push({
      id:          `issued_inv_due_soon_${inv.id}`,
      type:        'issued_invoice_due_soon',
      severity:    'medium',
      title:       `Factura vence pronto — ${inv.invoiceNumber}`,
      description: inv.clientName ? `Cliente: ${inv.clientName}` : 'Revisar fecha de vencimiento',
      href:        '/admin/facturacion?tab=facturas',
      amount:      Number(inv.totalAmount),
      daysInfo:    label,
    });
  }

  // 13 → notificaciones personales persistentes (task_assigned, task_completed)
  for (const n of persistentNotifs) {
    const href = n.relatedEntityId
      ? `/admin/tareas?t=${n.relatedEntityId}`
      : '/admin/tareas';
    items.push({
      id:          `notif_${n.id}`,
      dbId:        n.id,
      type:        n.type as AlertType,
      severity:    'low',
      title:       n.title,
      description: n.description ?? '',
      href,
    });
  }

  // Notificaciones personales van primero (antes del sort por severidad)
  const personal  = items.filter((a) => a.dbId !== undefined);
  const system    = items.filter((a) => a.dbId === undefined)
                         .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const sorted    = [...personal, ...system].slice(0, 10);

  const summary: AlertSummary = {
    overdueTasksCount:     overdueTasks.length,
    overdueFollowupsCount: overdueFollowups.length,
    unpaidBrandCount:      unpaidBrand.length,
    pendingTalentCount:    pendingTalent.length,
    expiringDealsCount:    expiringDeals.length,
    total:                 overdueTasks.length + overdueFollowups.length + unpaidBrand.length + pendingTalent.length + expiringDeals.length + expiredActive.length + persistentNotifs.length,
  };

  return { alerts: sorted, summary };
}
