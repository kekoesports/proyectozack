import { sql, desc, eq, gt, lt, lte, ne, and, or, inArray, isNull, isNotNull, asc, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  talents,
  caseStudies,
  contactSubmissions,
  giveaways,
  user,
  crmBrandFollowups,
  crmBrands,
  crmTasks,
  campaigns,
  invoices,
} from '@/db/schema';
import { getSocialPlatformKey } from '@/lib/utils/platform';
import { countAgencyCreators } from './agencyCreators';
import { getAllTalents } from './talents';
import { parseFollowers, formatCompact, totalFollowersForCreator } from '@/lib/utils/format';
import { PENDING_INCOME_FILTER } from '@/lib/utils/invoice-status';

import type { Role } from '@/lib/auth-guard';

type TaskSession = {
  readonly userId: string;
  readonly role: Role;
};

function taskVisibilityCondition(session?: TaskSession) {
  if (!session || session.role === 'admin' || session.role === 'manager') return undefined;
  return or(
    eq(crmTasks.assignedToUserId, session.userId),
    eq(crmTasks.createdByUserId, session.userId),
    eq(crmTasks.ownerId, session.userId),
  );
}

export type DashboardFollowup = {
  readonly id: number;
  readonly scheduledAt: Date;
  readonly brandName: string;
  readonly note: string;
};

export type DashboardPendingTask = {
  readonly id: number;
  readonly title: string;
  readonly priority: string;
  readonly category: string | null;
  readonly dueDate: string | null;
};

export type DashboardStats = {
  talentCount: number;
  publicCount: number;
  internalCount: number;
  agencyCount: number;
  caseCount: number;
  contactCount: number;
  activeBrandCount: number;
  activeGiveawayCount: number;
  followersByPlatform: Record<string, number>;
};

export type TopCreator = {
  name: string;
  slug: string;
  totalFollowers: number;
  totalFormatted: string;
  socials: Array<{ platform: string; followersDisplay: string }>;
};

export type AdminDashboardData = {
  stats: DashboardStats;
  topCreators: TopCreator[];
};

function buildTopCreators(limit: number, allTalents: Awaited<ReturnType<typeof getAllTalents>>): TopCreator[] {
  return allTalents
    .map((t) => ({
      name: t.name,
      slug: t.slug,
      totalFollowers: totalFollowersForCreator(t.socials),
      totalFormatted: formatCompact(totalFollowersForCreator(t.socials)),
      socials: t.socials.map((s) => ({
        platform: s.platform,
        followersDisplay: s.followersDisplay,
      })),
    }))
    .sort((a, b) => b.totalFollowers - a.totalFollowers)
    .slice(0, limit);
}

function buildFollowersByPlatform(allTalents: Awaited<ReturnType<typeof getAllTalents>>): Record<string, number> {
  const followersByPlatform: Record<string, number> = {};
  for (const t of allTalents) {
    for (const s of t.socials) {
      const key = getSocialPlatformKey(s.platform) ?? s.platform;
      const parsed = parseFollowers(s.followersDisplay);
      followersByPlatform[key] = (followersByPlatform[key] ?? 0) + parsed;
    }
  }
  return followersByPlatform;
}

/**
 * Datos completos del dashboard admin: stats agregadas + top creators.
 *
 * @cache none
 * @visibility admin
 * @returns `{ stats, topCreators }` calculados sobre datos reales (no mocks).
 */
export async function getAdminDashboardData(limit = 5): Promise<AdminDashboardData> {
  const now = new Date();

  const [
    talentRows,
    publicRows,
    internalRows,
    agencyCount,
    caseRows,
    contactRows,
    brandRows,
    giveawayRows,
    allTalents,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(talents),
    db.select({ count: sql<number>`count(*)` }).from(talents).where(eq(talents.visibility, 'public')),
    db.select({ count: sql<number>`count(*)` }).from(talents).where(eq(talents.visibility, 'internal')),
    countAgencyCreators(),
    db.select({ count: sql<number>`count(*)` }).from(caseStudies),
    db.select({ count: sql<number>`count(*)` }).from(contactSubmissions),
    db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, 'brand')),
    db.select({ count: sql<number>`count(*)` }).from(giveaways).where(gt(giveaways.endsAt, now)),
    getAllTalents(),
  ]);

  return {
    stats: {
      talentCount: talentRows[0]?.count ?? 0,
      publicCount: publicRows[0]?.count ?? 0,
      internalCount: internalRows[0]?.count ?? 0,
      agencyCount,
      caseCount: caseRows[0]?.count ?? 0,
      contactCount: contactRows[0]?.count ?? 0,
      activeBrandCount: brandRows[0]?.count ?? 0,
      activeGiveawayCount: giveawayRows[0]?.count ?? 0,
      followersByPlatform: buildFollowersByPlatform(allTalents),
    },
    topCreators: buildTopCreators(limit, allTalents),
  };
}

export type RecentContact = {
  id: number;
  name: string;
  email: string;
  type: string;
  company: string | null;
  createdAt: Date;
};

/**
 * Últimos `limit` contact submissions ordenados por `createdAt DESC` para el dashboard admin.
 *
 * @cache none
 * @visibility admin
 * @returns array de `RecentContact`.
 */
export async function getRecentContacts(limit = 5): Promise<RecentContact[]> {
  const rows = await db
    .select({
      id: contactSubmissions.id,
      name: contactSubmissions.name,
      email: contactSubmissions.email,
      type: contactSubmissions.type,
      company: contactSubmissions.company,
      createdAt: contactSubmissions.createdAt,
    })
    .from(contactSubmissions)
    .orderBy(sql`${contactSubmissions.createdAt} DESC`)
    .limit(limit);

  return rows;
}

// ── CRM Dashboard queries ─────────────────────────────────────────────────────

/**
 * Cuenta follow-ups vencidos: `status='vencido'` o `scheduledAt < hoy AND status='pendiente'`,
 * siempre con `completedAt IS NULL`. Widget del dashboard CRM.
 *
 * @cache none
 * @visibility admin
 * @returns número de follow-ups vencidos.
 */
export async function getOverdueFollowupsCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmBrandFollowups)
    .where(
      and(
        isNull(crmBrandFollowups.completedAt),
        or(
          eq(crmBrandFollowups.status, 'vencido'),
          and(
            lt(crmBrandFollowups.scheduledAt, today),
            eq(crmBrandFollowups.status, 'pendiente'),
          ),
        ),
      ),
    );

  return row?.count ?? 0;
}

/**
 * Cuenta tareas urgentes (`dueDate <= hoy` Madrid TZ, `status != 'completada'`).
 * Si la sesión es `staff`, filtra a tareas asignadas/creadas/owned por el user.
 *
 * @cache none
 * @visibility admin
 * @scope admin | manager | staff (staff sólo ve sus propias tareas)
 * @returns número de tareas urgentes visibles para el rol.
 */
export async function getUrgentTasksCount(session?: TaskSession): Promise<number> {
  const todayMadrid = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const filters = [ne(crmTasks.status, 'completada'), lte(crmTasks.dueDate, todayMadrid)];
  const visible = taskVisibilityCondition(session);
  if (visible !== undefined) filters.push(visible);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmTasks)
    .where(and(...filters));

  return row?.count ?? 0;
}

export type UpcomingFollowup = {
  readonly id: number;
  readonly brandName: string;
  readonly scheduledAt: Date;
  readonly channel: string | null;
  readonly status: string;
};

/**
 * Follow-ups programados para los próximos 7 días que aún no han sido completados.
 *
 * Atención: el JSDoc previo dice "next N days (default 7)" pero el rango está hardcoded
 * a 7 días — el parámetro `limit` controla sólo el LIMIT de filas, no el rango temporal.
 *
 * @cache none
 * @visibility admin
 * @returns array `<= limit` ordenado por `scheduledAt ASC`.
 */
export async function getUpcomingFollowups(limit = 10): Promise<readonly UpcomingFollowup[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: crmBrandFollowups.id,
      brandName: crmBrands.name,
      scheduledAt: crmBrandFollowups.scheduledAt,
      channel: crmBrandFollowups.channel,
      status: crmBrandFollowups.status,
    })
    .from(crmBrandFollowups)
    .innerJoin(crmBrands, eq(crmBrands.id, crmBrandFollowups.brandId))
    .where(
      and(
        isNull(crmBrandFollowups.completedAt),
        lte(crmBrandFollowups.scheduledAt, cutoff),
      ),
    )
    .orderBy(asc(crmBrandFollowups.scheduledAt))
    .limit(limit);

  return rows;
}

export type UrgentTask = {
  readonly id: number;
  readonly title: string;
  readonly priority: string;
  readonly dueDate: Date | null;
  readonly ownerName: string | null;
};

/**
 * Top `limit` tareas urgentes (`dueDate <= hoy`, no completadas) ordenadas por prioridad y fecha.
 * Filtra por sesión si el rol es staff (sólo tareas asignadas/creadas/owned).
 *
 * @cache none
 * @visibility admin
 * @scope admin | manager | staff (staff sólo ve sus propias tareas)
 * @returns array `<= limit` ordenado por priority (alta→baja) y `dueDate ASC`.
 */
export async function getUrgentTasks(limit = 5, session?: TaskSession): Promise<readonly UrgentTask[]> {
  const todayMadrid = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const PRIORITY_ORDER = sql`CASE ${crmTasks.priority}
    WHEN 'alta' THEN 0
    WHEN 'media' THEN 1
    WHEN 'baja' THEN 2
  END`;

  const filters = [ne(crmTasks.status, 'completada'), lte(crmTasks.dueDate, todayMadrid)];
  const visible = taskVisibilityCondition(session);
  if (visible !== undefined) filters.push(visible);

  const rows = await db
    .select({
      id: crmTasks.id,
      title: crmTasks.title,
      priority: crmTasks.priority,
      dueDate: crmTasks.dueDate,
      ownerName: user.name,
    })
    .from(crmTasks)
    .leftJoin(user, eq(user.id, crmTasks.ownerId))
    .where(and(...filters))
    .orderBy(asc(PRIORITY_ORDER), asc(crmTasks.dueDate))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
    dueDate: r.dueDate !== null ? new Date(r.dueDate) : null,
    ownerName: r.ownerName ?? null,
  }));
}

/**
 * Cuenta brands del CRM con `status = 'activa'` para el widget del dashboard.
 *
 * @cache none
 * @visibility admin
 * @returns número de brands activas.
 */
export async function getActiveBrandsCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmBrands)
    .where(eq(crmBrands.status, 'activa'));

  return row?.count ?? 0;
}

// ── Campaign Dashboard queries ────────────────────────────────────────────────

/**
 * Cuenta campañas activas (`status = 'activa'` AND `archivedAt IS NULL`) — widget del dashboard.
 *
 * @cache none
 * @visibility admin
 * @returns número de campañas activas no archivadas.
 */
export async function getActiveCampaignsCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, 'activa'),
        isNull(campaigns.archivedAt),
      ),
    );

  return row?.count ?? 0;
}

/**
 * Total pendiente de cobro a brands en facturas vinculadas a campañas.
 * Suma facturas `kind='income'` con `status` IN `PENDING_INCOME_STATUSES`
 * (emitida / no_cobrada / parcial / vencida) y `campaignId IS NOT NULL`.
 *
 * Excluye drafts (`borrador`), liquidadas (`cobrada`/`pagada`) y anuladas.
 * Misma semántica que `pnl.ts:pendienteCobro`.
 *
 * @cache none
 * @visibility admin
 * @returns suma de `totalAmount` en EUR.
 */
export async function getPendingBrandPaymentsTotal(): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.kind, 'income'),
        inArray(invoices.status, PENDING_INCOME_FILTER),
        isNotNull(invoices.campaignId),
      ),
    );

  return parseFloat(row?.total ?? '0');
}

// ── Dashboard widgets (rediseño CRM v2) ───────────────────────────────────────

export type CrmBrandCounts = {
  readonly activa: number;
  readonly lead: number;
  readonly total: number;
};

/**
 * Cuenta brands del CRM agrupadas por status `activa` y `lead`.
 *
 * @cache none
 * @visibility admin
 * @returns `{ activa, lead, total }`.
 */
export async function getCrmBrandCounts(): Promise<CrmBrandCounts> {
  const rows = await db
    .select({
      status: crmBrands.status,
      count: sql<number>`count(*)::int`,
    })
    .from(crmBrands)
    .where(inArray(crmBrands.status, ['activa', 'lead']))
    .groupBy(crmBrands.status);

  const activa = rows.find((r) => r.status === 'activa')?.count ?? 0;
  const lead = rows.find((r) => r.status === 'lead')?.count ?? 0;
  return { activa, lead, total: activa + lead };
}

/**
 * Tareas pendientes de la semana (`weekLabel`) en estado `pendiente|en_progreso`,
 * ordenadas por prioridad (alta→baja) y `dueDate ASC`.
 *
 * @cache none
 * @visibility admin
 * @returns array `<= limit`.
 */
export async function getDashboardPendingTasks(
  weekLabel: string,
  limit = 6,
): Promise<readonly DashboardPendingTask[]> {
  const rows = await db
    .select({
      id: crmTasks.id,
      title: crmTasks.title,
      priority: crmTasks.priority,
      dueDate: crmTasks.dueDate,
      category: crmTasks.category,
    })
    .from(crmTasks)
    .where(
      and(
        eq(crmTasks.weekLabel, weekLabel),
        inArray(crmTasks.status, ['pendiente', 'en_progreso']),
      ),
    )
    .orderBy(
      sql`CASE ${crmTasks.priority} WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END`,
      crmTasks.dueDate,
    )
    .limit(limit);

  return rows;
}

/**
 * Próximos follow-ups pendientes (no completados), ordenados por `scheduledAt ASC`.
 *
 * @cache none
 * @visibility admin
 * @returns array `<= limit`.
 */
export async function getDashboardUpcomingFollowups(
  limit = 5,
): Promise<readonly DashboardFollowup[]> {
  const rows = await db
    .select({
      id: crmBrandFollowups.id,
      note: crmBrandFollowups.note,
      scheduledAt: crmBrandFollowups.scheduledAt,
      brandName: crmBrands.name,
    })
    .from(crmBrandFollowups)
    .leftJoin(crmBrands, eq(crmBrands.id, crmBrandFollowups.brandId))
    .where(isNull(crmBrandFollowups.completedAt))
    .orderBy(asc(crmBrandFollowups.scheduledAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    note: r.note,
    scheduledAt: r.scheduledAt,
    brandName: r.brandName ?? '—',
  }));
}

export type MonthlyRevenue = { readonly income: number; readonly expense: number };

/**
 * Ingresos y gastos del mes en curso desde facturas `cobrada` o `emitida`.
 *
 * @cache none
 * @visibility admin
 * @returns `{ income, expense }` en EUR.
 */
export async function getMonthlyRevenue(): Promise<MonthlyRevenue> {
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const rows = await db
    .select({
      kind: invoices.kind,
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        inArray(invoices.status, ['cobrada', 'emitida']),
        gte(invoices.issueDate, firstDay),
      ),
    )
    .groupBy(invoices.kind);

  return {
    income: Number(rows.find((r) => r.kind === 'income')?.total ?? 0),
    expense: Number(rows.find((r) => r.kind === 'expense')?.total ?? 0),
  };
}

export type DealStats = {
  readonly yearlyDeals: number;
  readonly activeDeals: number;
};

/**
 * Tratos del año (income cobradas) y tratos activos (income emitidas).
 *
 * @cache none
 * @visibility admin
 * @returns `{ yearlyDeals, activeDeals }`.
 */
export async function getDealStats(): Promise<DealStats> {
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [yearly, active] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(invoices)
      .where(
        and(
          eq(invoices.kind, 'income'),
          eq(invoices.status, 'cobrada'),
          gte(invoices.issueDate, yearStart),
        ),
      ),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(invoices)
      .where(
        and(
          eq(invoices.kind, 'income'),
          eq(invoices.status, 'emitida'),
        ),
      ),
  ]);

  return {
    yearlyDeals: yearly[0]?.count ?? 0,
    activeDeals: active[0]?.count ?? 0,
  };
}

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
export async function getDashboardActivity(limit = 5): Promise<readonly DashboardActivityItem[]> {
  const [recentInvoices, recentBrands, recentTasks] = await Promise.all([
    db
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
      .orderBy(desc(crmBrands.createdAt))
      .limit(4),

    db
      .select({
        id: crmTasks.id,
        title: crmTasks.title,
        updatedAt: crmTasks.updatedAt,
      })
      .from(crmTasks)
      .where(eq(crmTasks.status, 'completada'))
      .orderBy(desc(crmTasks.updatedAt))
      .limit(4),
  ]);

  const items: DashboardActivityItem[] = [
    ...recentInvoices.map((inv) => ({
      id: `invoice-${inv.id}`,
      icon: 'invoice' as ActivityIcon,
      text: inv.kind === 'income' ? 'Factura de ingreso emitida' : 'Factura de gasto registrada',
      entity: inv.counterpartyName ?? '—',
      time: inv.createdAt,
    })),
    ...recentBrands.map((b) => ({
      id: `brand-${b.id}`,
      icon: (b.status === 'lead' ? 'lead' : 'brand') as ActivityIcon,
      text: b.status === 'lead' ? 'Nuevo lead añadido' : 'Marca registrada en CRM',
      entity: b.name,
      time: b.createdAt,
    })),
    ...recentTasks.map((t) => ({
      id: `task-${t.id}`,
      icon: 'task' as ActivityIcon,
      text: 'Tarea completada',
      entity: t.title,
      time: t.updatedAt,
    })),
  ];

  return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, limit);
}
