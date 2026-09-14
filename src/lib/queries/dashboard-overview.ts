import { sql, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { caseStudies, contactSubmissions, giveaways, user } from '@/db/schema';
import { getSocialPlatformKey } from '@/lib/utils/platform';
import { countAgencyCreators } from './agencyCreators';
import { getAllTalents } from './talents';
import { parseFollowers, formatCompact, totalFollowersForCreator } from '@/lib/utils/format';

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
    agencyCount,
    caseRows,
    contactRows,
    brandRows,
    giveawayRows,
    allTalents,
  ] = await Promise.all([
    countAgencyCreators(),
    db.select({ count: sql<number>`count(*)` }).from(caseStudies),
    db.select({ count: sql<number>`count(*)` }).from(contactSubmissions),
    db.select({ count: sql<number>`count(*)` }).from(user).where(eq(user.role, 'brand')),
    db.select({ count: sql<number>`count(*)` }).from(giveaways).where(gt(giveaways.endsAt, now)),
    // Use the same non-archived roster for counts, rankings and the linked list.
    getAllTalents({ includeArchived: false }),
  ]);

  return {
    stats: {
      talentCount: allTalents.length,
      publicCount: allTalents.filter((talent) => talent.visibility === 'public').length,
      internalCount: allTalents.filter((talent) => talent.visibility === 'internal').length,
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

