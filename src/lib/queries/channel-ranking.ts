import 'server-only';
import { and, asc, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talentChannelSnapshots, talentMetricSnapshots, talents } from '@/db/schema';

export async function getChannelRanking() {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [channels, followers] = await Promise.all([
    db.select({ talentId: talents.id, name: talents.name, socialId: talentChannelSnapshots.socialId,
      platform: talentChannelSnapshots.platform, date: talentChannelSnapshots.snapshotDate,
      value: talentChannelSnapshots.avgViews30d, source: talentChannelSnapshots.dataSource,
      uploads: talentChannelSnapshots.uploads30d })
      .from(talentChannelSnapshots).innerJoin(talents, eq(talents.id, talentChannelSnapshots.talentId))
      .where(and(isNull(talents.archivedAt), gte(talentChannelSnapshots.snapshotDate, since),
        eq(talentChannelSnapshots.platform, 'youtube'), eq(talentChannelSnapshots.dataSource, 'youtube_api')))
      .orderBy(asc(talentChannelSnapshots.socialId), desc(talentChannelSnapshots.snapshotDate)),
    db.select({ talentId: talents.id, name: talents.name, platform: talentMetricSnapshots.platform,
      date: talentMetricSnapshots.snapshotDate, value: talentMetricSnapshots.value, source: talentMetricSnapshots.dataSource })
      .from(talentMetricSnapshots).innerJoin(talents, eq(talents.id, talentMetricSnapshots.talentId))
      .where(and(isNull(talents.archivedAt), gte(talentMetricSnapshots.snapshotDate, since),
        eq(talentMetricSnapshots.platform, 'twitch'), eq(talentMetricSnapshots.metricType, 'followers'),
        inArray(talentMetricSnapshots.dataSource, ['twitch_api'])))
      .orderBy(asc(talentMetricSnapshots.talentId), desc(talentMetricSnapshots.snapshotDate)),
  ]);
  const latestYoutube = [...new Map(channels.slice().reverse().map(row => [row.socialId, row])).values()];
  const latestTwitch = [...new Map(followers.slice().reverse().map(row => [row.talentId, row])).values()];
  const youtube = latestYoutube.filter(row => row.value !== null && Number.isSafeInteger(row.value) && row.value >= 0)
    .sort((a,b) => (b.value ?? 0) - (a.value ?? 0)).slice(0,12)
    .map(row => ({ ...row, history: channels.filter(x => x.socialId === row.socialId && x.value !== null)
      .map(x => ({ date:x.date, value:x.value })).reverse() }));
  const twitch = latestTwitch.filter(row => Number.isSafeInteger(row.value) && row.value >= 0)
    .sort((a,b) => b.value - a.value).slice(0,12)
    .map(row => ({ ...row, history: followers.filter(x => x.talentId === row.talentId)
      .map(x => ({ date:x.date, value:x.value })).reverse() }));
  return { youtube, twitch, youtubeChannels: latestYoutube.length,
    youtubeWithViews: latestYoutube.filter(row => row.value !== null).length,
    twitchChannels: latestTwitch.length, since, checkedAt: new Date().toISOString() };
}

export type ChannelRanking = Awaited<ReturnType<typeof getChannelRanking>>;
