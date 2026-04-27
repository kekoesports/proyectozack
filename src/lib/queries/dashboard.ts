import { sql, eq, gt, lt, lte, ne, and, or, isNull, isNotNull, asc } from 'drizzle-orm';
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
import { getSocialPlatformKey } from '@/lib/platform';
import { countAgencyCreators } from './agencyCreators';
import { getAllTalents } from './talents';
import { parseFollowers, formatCompact, totalFollowersForCreator } from '@/lib/format';

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
 * Count follow-ups that are overdue:
 * status='vencido' OR (scheduledAt < today AND completedAt IS NULL AND status='pendiente')
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
 * Count urgent tasks: dueDate <= today AND status != 'completada'
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
 * Get upcoming follow-ups for the next N days (default 7), not yet completed.
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
 * Get urgent tasks: dueDate <= today AND status != 'completada', top N by priority then dueDate.
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
 * Count active brands (status = 'activa').
 */
export async function getActiveBrandsCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmBrands)
    .where(eq(crmBrands.status, 'activa'));

  return row?.count ?? 0;
}

/**
 * Count creators whose last snapshot is older than daysThreshold days (or have no snapshot).
 */
export async function getStaleStatsCount(daysThreshold = 30): Promise<number> {
  const { getStaleStatsCreators } = await import('./analytics');
  const stale = await getStaleStatsCreators(daysThreshold);
  return stale.length;
}

// ── Campaign Dashboard queries ────────────────────────────────────────────────

/**
 * Count active campaigns: status = 'activa' AND archivedAt IS NULL.
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
 * Total pending brand payments (income invoices not yet collected):
 * kind = 'income', status != 'cobrada', campaignId IS NOT NULL.
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
        ne(invoices.status, 'cobrada'),
        isNotNull(invoices.campaignId),
      ),
    );

  return parseFloat(row?.total ?? '0');
}

/**
 * Total pending talent payments (expense invoices not yet collected):
 * kind = 'expense', status != 'cobrada', campaignId IS NOT NULL.
 */
export async function getPendingTalentPaymentsTotal(): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.kind, 'expense'),
        ne(invoices.status, 'cobrada'),
        isNotNull(invoices.campaignId),
      ),
    );

  return parseFloat(row?.total ?? '0');
}
