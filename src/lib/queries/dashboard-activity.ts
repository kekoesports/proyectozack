import { sql, desc, eq, ne, and, or, inArray, isNull, lt, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, crmTasks, invoices, crmBrandFollowups } from '@/db/schema';
import { SETTLED_INCOME_STATUSES, isSettledInvoiceStatus } from '@/lib/utils/invoice-status';

// ── Activity feed (datos reales) ──────────────────────────────────────────────

export type ActivityIcon = 'brand' | 'lead' | 'deal' | 'task' | 'invoice' | 'talent';

export type DashboardActivityItem = {
  readonly id: string;
  readonly icon: ActivityIcon;
  readonly text: string;
  readonly entity: string;
  readonly time: Date;
};

/**
 * Feed de actividad reciente: últimas facturas, brands y tareas completadas,
 * mezcladas y ordenadas por tiempo descendente.
 *
 * @cache none
 * @visibility admin
 * @returns array <= limit ordenado por `time DESC`.
 */
export async function getDashboardActivity(
  limit = 5,
  opts?: { readonly staffUserId?: string; readonly skipFinancial?: boolean },
): Promise<readonly DashboardActivityItem[]> {
  const staffId = opts?.staffUserId;
  const skipFinancial = opts?.skipFinancial === true || Boolean(staffId);

  const brandScope = staffId
    ? or(
        eq(crmBrands.assignedToUserId, staffId),
        eq(crmBrands.coAssignedToUserId, staffId),
        eq(crmBrands.createdByUserId, staffId),
      )
    : undefined;

  const taskScope = staffId
    ? or(
        eq(crmTasks.assignedToUserId, staffId),
        eq(crmTasks.createdByUserId, staffId),
        eq(crmTasks.ownerId, staffId),
      )
    : undefined;

  const [recentInvoices, recentBrands, recentTasks] = await Promise.all([
    skipFinancial
      ? Promise.resolve([] as Array<{
          id: number;
          kind: string;
          status: string;
          counterpartyName: string | null;
          createdAt: Date;
        }>)
      : db
          .select({
            id: invoices.id,
            kind: invoices.kind,
            status: invoices.status,
            counterpartyName: invoices.counterpartyName,
            createdAt: invoices.createdAt,
          })
          .from(invoices)
          .where(ne(invoices.status, 'borrador'))
          .orderBy(desc(invoices.createdAt))
          .limit(4),

    db
      .select({
        id: crmBrands.id,
        name: crmBrands.name,
        status: crmBrands.status,
        createdAt: crmBrands.createdAt,
      })
      .from(crmBrands)
      .where(brandScope)
      .orderBy(desc(crmBrands.createdAt))
      .limit(4),

    db
      .select({
        id: crmTasks.id,
        title: crmTasks.title,
        updatedAt: crmTasks.updatedAt,
      })
      .from(crmTasks)
      .where(and(eq(crmTasks.status, 'completada'), taskScope))
      .orderBy(desc(crmTasks.updatedAt))
      .limit(4),
  ]);

  const items: DashboardActivityItem[] = [
    ...recentInvoices.map((inv) => ({
      id: `invoice-${inv.id}`,
      icon: 'invoice' as const,
      text: inv.kind === 'income' ? 'Factura de ingreso emitida' : 'Factura de gasto registrada',
      entity: inv.counterpartyName ?? '—',
      time: inv.createdAt,
    })),
    ...recentBrands.map((b) => ({
      id: `brand-${b.id}`,
      icon: b.status === 'lead' ? 'lead' as const : 'brand' as const,
      text: b.status === 'lead' ? 'Nuevo lead añadido' : 'Marca registrada en CRM',
      entity: b.name,
      time: b.createdAt,
    })),
    ...recentTasks.map((t) => ({
      id: `task-${t.id}`,
      icon: 'task' as const,
      text: 'Tarea completada',
      entity: t.title,
      time: t.updatedAt,
    })),
  ];

  return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, limit);
}

// ── Dashboard insights (datos reales) ────────────────────────────────────────

export type InsightType = 'danger' | 'warning' | 'success';

export type InsightItem = {
  readonly id: number;
  readonly type: InsightType;
  readonly text: string;
  readonly action?: string;
  readonly actionHref?: string;
};

/**
 * Insights accionables del CRM: follow-ups vencidos, leads nuevos esta semana
 * y tasa de cierre del año en curso.
 *
 * @cache none
 * @visibility admin
 * @returns array de hasta 3 InsightItem ordenados por severidad.
 */
export async function getDashboardInsights(): Promise<readonly InsightItem[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yearStart = `${now.getFullYear()}-01-01`;

  const [overdueRows, thisWeekRows, prevWeekRows, dealRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` })
      .from(crmBrandFollowups)
      .where(and(
        isNull(crmBrandFollowups.completedAt),
        or(
          eq(crmBrandFollowups.status, 'vencido'),
          and(lt(crmBrandFollowups.scheduledAt, today), eq(crmBrandFollowups.status, 'pendiente')),
        ),
      )),
    db.select({ count: sql<number>`count(*)::int` })
      .from(crmBrands)
      .where(and(eq(crmBrands.status, 'lead'), gte(crmBrands.createdAt, sevenDaysAgo))),
    db.select({ count: sql<number>`count(*)::int` })
      .from(crmBrands)
      .where(and(
        eq(crmBrands.status, 'lead'),
        gte(crmBrands.createdAt, fourteenDaysAgo),
        lt(crmBrands.createdAt, sevenDaysAgo),
      )),
    db.select({ status: invoices.status, count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(
        eq(invoices.kind, 'income'),
        // Settled = cobrada|pagada (AGENTS.md); open pipeline includes emitida.
        inArray(invoices.status, [...SETTLED_INCOME_STATUSES, 'emitida']),
        gte(invoices.issueDate, yearStart),
      ))
      .groupBy(invoices.status),
  ]);

  const insights: InsightItem[] = [];
  let id = 1;

  const overdueCount = overdueRows[0]?.count ?? 0;
  if (overdueCount > 0) {
    insights.push({
      id: id++,
      type: 'danger',
      text: `Tienes ${overdueCount} follow-up${overdueCount > 1 ? 's' : ''} vencido${overdueCount > 1 ? 's' : ''}`,
      action: 'Revisar pipeline',
      actionHref: '/admin/brands',
    });
  } else {
    insights.push({ id: id++, type: 'success', text: 'Sin follow-ups vencidos esta semana' });
  }

  const thisWeek = thisWeekRows[0]?.count ?? 0;
  const prevWeek = prevWeekRows[0]?.count ?? 0;
  if (thisWeek === 0) {
    insights.push({
      id: id++,
      type: 'warning',
      text: prevWeek > 0
        ? `Sin leads nuevos esta semana (sem. ant.: ${prevWeek})`
        : 'Sin leads nuevos esta semana',
      action: 'Activar prospección',
      actionHref: '/admin/brands',
    });
  } else {
    insights.push({
      id: id++,
      type: thisWeek >= prevWeek ? 'success' : 'warning',
      text: prevWeek > 0
        ? `${thisWeek} lead${thisWeek > 1 ? 's' : ''} esta semana (sem. ant.: ${prevWeek})`
        : `${thisWeek} lead${thisWeek > 1 ? 's' : ''} nuevo${thisWeek > 1 ? 's' : ''} esta semana`,
      ...(thisWeek < prevWeek ? { action: 'Ver pipeline', actionHref: '/admin/brands' } : {}),
    });
  }

  // Closed = any settled income status (cobrada AND pagada), not cobrada alone.
  const settled = dealRows
    .filter((r) => isSettledInvoiceStatus(r.status))
    .reduce((s, r) => s + r.count, 0);
  const emitidas = dealRows.filter((r) => r.status === 'emitida').reduce((s, r) => s + r.count, 0);
  const total = settled + emitidas;
  if (total > 0) {
    const rate = Math.round((settled / total) * 100);
    insights.push({
      id: id++,
      type: rate >= 30 ? 'success' : 'warning',
      text: `Tasa de cierre ${now.getFullYear()}: ${rate}% (${settled}/${total} tratos)`,
    });
  }

  return insights;
}

// ── Pipeline history (datos reales) ──────────────────────────────────────────

export type PipelinePoint = { readonly date: string; readonly value: number };

export type PipelineHistoryAll = {
  readonly d7: readonly PipelinePoint[];
  readonly d30: readonly PipelinePoint[];
  readonly d90: readonly PipelinePoint[];
};

/**
 * Evolución del pipeline: facturas de ingreso agrupadas por periodo.
 * Cada punto = sum(totalAmount) de income invoices emitidas en ese bucket.
 * Los buckets vacíos valen 0.
 *
 * @cache none
 * @visibility admin
 */
export async function getPipelineHistory(range: '7d' | '30d' | '90d'): Promise<PipelinePoint[]> {
  const now = new Date();

  type Bucket = { start: string; label: string };
  const buckets: Bucket[] = [];

  if (range === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      buckets.push({ start, label });
    }
  } else if (range === '30d') {
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      buckets.push({ start, label });
    }
  } else {
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      buckets.push({ start, label });
    }
  }

  const startStr = buckets[0]?.start ?? '';
  const rows = await db
    .select({ issueDate: invoices.issueDate, total: invoices.totalAmount })
    .from(invoices)
    .where(and(eq(invoices.kind, 'income'), gte(invoices.issueDate, startStr)));

  const totals = new Array<number>(buckets.length).fill(0);
  for (const row of rows) {
    const dateStr = String(row.issueDate).slice(0, 10);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (dateStr >= (buckets[i]?.start ?? '')) {
        totals[i] = (totals[i] ?? 0) + parseFloat(String(row.total));
        break;
      }
    }
  }

  return buckets.map((b, i) => ({ date: b.label, value: totals[i] ?? 0 }));
}

/**
 * Obtiene el histórico de pipeline para los tres rangos en paralelo.
 *
 * @cache none
 * @visibility admin
 * @returns `{ d7, d30, d90 }`
 */
export async function getPipelineHistoryAll(): Promise<PipelineHistoryAll> {
  const [d7, d30, d90] = await Promise.all([
    getPipelineHistory('7d'),
    getPipelineHistory('30d'),
    getPipelineHistory('90d'),
  ]);
  return { d7, d30, d90 };
}
