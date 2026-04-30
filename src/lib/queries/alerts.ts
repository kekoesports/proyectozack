import { and, asc, eq, isNull, isNotNull, lt, not, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmTasks, crmBrandFollowups, crmBrands, campaigns, talents } from '@/db/schema';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType =
  | 'overdue_task'
  | 'overdue_followup'
  | 'unpaid_brand'
  | 'pending_talent'
  | 'expiring_deal'
  | 'expired_active';

export type DashboardAlert = {
  readonly id:          string;
  readonly type:        AlertType;
  readonly severity:    AlertSeverity;
  readonly title:       string;
  readonly description: string;
  readonly href:        string;
  readonly amount?:     number | undefined;
  readonly daysInfo?:   string | undefined;
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

// ── Main query ────────────────────────────────────────────────────────

export async function getDashboardAlerts(): Promise<{
  alerts:  readonly DashboardAlert[];
  summary: AlertSummary;
}> {
  const today    = todayMadrid();
  const in7days  = new Date(Date.now() + 7  * 86_400_000).toISOString().slice(0, 10);
  const in3days  = new Date(Date.now() + 3  * 86_400_000).toISOString().slice(0, 10);

  const [
    overdueTasks,
    overdueFollowups,
    unpaidBrand,
    pendingTalent,
    expiringDeals,
    expiredActive,
  ] = await Promise.all([
    // 1. Tareas vencidas (max 3)
    db.select({
      id: crmTasks.id, title: crmTasks.title,
      priority: crmTasks.priority, category: crmTasks.category, dueDate: crmTasks.dueDate,
    }).from(crmTasks)
      .where(and(
        not(eq(crmTasks.status, 'completada')),
        isNotNull(crmTasks.dueDate),
        sql`${crmTasks.dueDate}::date < ${today}::date`,
      ))
      .orderBy(asc(crmTasks.dueDate))
      .limit(3),

    // 2. Follow-ups vencidos (max 3)
    db.select({
      id: crmBrandFollowups.id, note: crmBrandFollowups.note,
      scheduledAt: crmBrandFollowups.scheduledAt,
      brandId: crmBrandFollowups.brandId, brandName: crmBrands.name,
    }).from(crmBrandFollowups)
      .innerJoin(crmBrands, eq(crmBrands.id, crmBrandFollowups.brandId))
      .where(and(
        isNull(crmBrandFollowups.completedAt),
        lt(crmBrandFollowups.scheduledAt, new Date()),
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

    // 5. Tratos que vencen en ≤7 días (max 3)
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
      ))
      .orderBy(asc(campaigns.endDate))
      .limit(3),

    // 6. Tratos activos con fecha ya vencida (max 3)
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
      ))
      .orderBy(asc(campaigns.endDate))
      .limit(3),
  ]);

  const items: DashboardAlert[] = [];

  // 1 → alertas de tareas
  for (const t of overdueTasks) {
    if (!t.dueDate) continue;
    const { days, label } = daysOverdueStr(t.dueDate);
    items.push({
      id:          `overdue_task_${t.id}`,
      type:        'overdue_task',
      severity:    t.priority === 'alta' ? 'critical' : t.priority === 'media' ? 'high' : 'medium',
      title:       `Tarea vencida — ${t.title}`,
      description: `${t.category}`,
      href:        '/admin/tareas',
      daysInfo:    label,
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

  // 3 → cobros pendientes
  for (const c of unpaidBrand) {
    const amount = Number(c.amountBrand ?? 0);
    const parts  = [c.brandName, c.talentName].filter(Boolean).join(' × ');
    items.push({
      id:          `unpaid_brand_${c.id}`,
      type:        'unpaid_brand',
      severity:    c.status === 'completada' ? 'high' : 'medium',
      title:       `Cobro pendiente${parts ? ` — ${parts}` : ''}`,
      description: `${fmt(amount)} sin cobrar`,
      href:        '/admin/campanas',
      amount,
      daysInfo:    c.status === 'completada' ? 'Trato completado' : 'Trato activo',
    });
  }

  // 4 → pagos a talento
  for (const c of pendingTalent) {
    const amount = Number(c.amountTalent ?? 0);
    items.push({
      id:          `pending_talent_${c.id}`,
      type:        'pending_talent',
      severity:    'medium',
      title:       `Pago pendiente — ${c.talentName ?? 'Talento'}`,
      description: `${fmt(amount)} sin pagar · ${c.brandName ?? ''}`,
      href:        '/admin/campanas',
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
      href:        '/admin/campanas',
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
      href:        '/admin/campanas',
      daysInfo:    label,
    });
  }

  const sorted = items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).slice(0, 8);

  const summary: AlertSummary = {
    overdueTasksCount:     overdueTasks.length,
    overdueFollowupsCount: overdueFollowups.length,
    unpaidBrandCount:      unpaidBrand.length,
    pendingTalentCount:    pendingTalent.length,
    expiringDealsCount:    expiringDeals.length,
    total:                 overdueTasks.length + overdueFollowups.length + unpaidBrand.length + pendingTalent.length + expiringDeals.length + expiredActive.length,
  };

  return { alerts: sorted, summary };
}
