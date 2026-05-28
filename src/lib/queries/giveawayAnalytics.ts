import { eq, gt, sql, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveawayEvents } from '@/db/schema/giveawayEvents';
import { giveaways } from '@/db/schema/giveaways';
import { talents } from '@/db/schema/talents';

export type GiveawayClickRow = {
  giveawayId: number;
  title:      string;
  brandName:  string;
  talentName: string;
  day:        string;
  clicks:     number;
};

export type GiveawayHubViewRow = {
  page: string;
  day:  string;
  views: number;
};

const SINCE_90D = () => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

// Clicks por sorteo, agrupados por día — últimos 90 días.
export async function getGiveawayClicksByDay(): Promise<GiveawayClickRow[]> {
  const since = SINCE_90D();

  return db
    .select({
      giveawayId: giveawayEvents.giveawayId,
      title:      giveaways.title,
      brandName:  giveaways.brandName,
      talentName: talents.name,
      day:        sql<string>`(${giveawayEvents.createdAt} AT TIME ZONE 'UTC')::date::text`,
      clicks:     sql<number>`cast(count(*) as int)`,
    })
    .from(giveawayEvents)
    .innerJoin(giveaways, eq(giveaways.id, giveawayEvents.giveawayId))
    .innerJoin(talents, eq(talents.id, giveaways.talentId))
    .where(
      and(
        eq(giveawayEvents.action, 'click'),
        gt(giveawayEvents.createdAt, since),
      ),
    )
    .groupBy(
      giveawayEvents.giveawayId,
      giveaways.title,
      giveaways.brandName,
      talents.name,
      sql`(${giveawayEvents.createdAt} AT TIME ZONE 'UTC')::date`,
    )
    .orderBy(sql`count(*) desc`) as Promise<GiveawayClickRow[]>;
}

// Vistas del hub (página /sorteos o /giveaways), agrupadas por día — últimos 90 días.
export async function getGiveawayHubViewsByDay(): Promise<GiveawayHubViewRow[]> {
  const since = SINCE_90D();

  return db
    .select({
      page:  sql<string>`coalesce(${giveawayEvents.page}, 'sorteos')`,
      day:   sql<string>`(${giveawayEvents.createdAt} AT TIME ZONE 'UTC')::date::text`,
      views: sql<number>`cast(count(*) as int)`,
    })
    .from(giveawayEvents)
    .where(
      and(
        eq(giveawayEvents.action, 'view'),
        isNull(giveawayEvents.giveawayId),
        gt(giveawayEvents.createdAt, since),
      ),
    )
    .groupBy(
      giveawayEvents.page,
      sql`(${giveawayEvents.createdAt} AT TIME ZONE 'UTC')::date`,
    )
    .orderBy(sql`(${giveawayEvents.createdAt} AT TIME ZONE 'UTC')::date desc`) as Promise<GiveawayHubViewRow[]>;
}
