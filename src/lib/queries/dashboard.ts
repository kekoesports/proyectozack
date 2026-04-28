import { sql, eq, gt, gte, and, inArray, lte, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  talents,
  caseStudies,
  contactSubmissions,
  giveaways,
  user,
  crmBrands,
  crmTasks,
  crmBrandFollowups,
  invoices,
} from '@/db/schema';
import type { CrmTask } from '@/types';
import { getSocialPlatformKey } from '@/lib/platform';
import { countAgencyCreators } from './agencyCreators';
import { getAllTalents } from './talents';
import { parseFollowers, formatCompact, totalFollowersForCreator } from '@/lib/format';

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

export async function getAdminDashboardStats(): Promise<DashboardStats> {
  const { stats } = await getAdminDashboardData();
  return stats;
}

export async function getTopCreatorsByFollowers(limit = 5): Promise<TopCreator[]> {
  const { topCreators } = await getAdminDashboardData(limit);
  return topCreators;
}

export type RecentContact = {
  id: number;
  name: string;
  email: string;
  type: string;
  company: string | null;
  createdAt: Date;
};

export type CrmBrandCounts = {
  activa: number;
  lead: number;
  total: number;
};

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

export type DashboardPendingTask = Pick<CrmTask, 'id' | 'title' | 'priority' | 'status' | 'dueDate' | 'category'>;

export async function getDashboardPendingTasks(weekLabel: string, limit = 6): Promise<DashboardPendingTask[]> {
  const rows = await db
    .select({
      id: crmTasks.id,
      title: crmTasks.title,
      priority: crmTasks.priority,
      status: crmTasks.status,
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

export type DashboardFollowup = {
  id: number;
  note: string;
  scheduledAt: Date;
  brandName: string;
};

export async function getDashboardUpcomingFollowups(limit = 5): Promise<DashboardFollowup[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: crmBrandFollowups.id,
      note: crmBrandFollowups.note,
      scheduledAt: crmBrandFollowups.scheduledAt,
      brandName: crmBrands.name,
    })
    .from(crmBrandFollowups)
    .leftJoin(crmBrands, eq(crmBrands.id, crmBrandFollowups.brandId))
    .where(
      and(
        isNull(crmBrandFollowups.completedAt),
        or(gt(crmBrandFollowups.scheduledAt, now), lte(crmBrandFollowups.scheduledAt, now)),
      ),
    )
    .orderBy(crmBrandFollowups.scheduledAt)
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    note: r.note,
    scheduledAt: r.scheduledAt,
    brandName: r.brandName ?? '—',
  }));
}

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

// ── Revenue mensual desde facturas reales ─────────────────────────────

export type MonthlyRevenue = { income: number; expense: number };

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

// ── Tratos: cerrados en el año y activos actualmente ─────────────────

export type DealStats = {
  yearlyDeals: number;   // income cobradas este año
  activeDeals: number;   // income emitidas (en curso)
};

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
