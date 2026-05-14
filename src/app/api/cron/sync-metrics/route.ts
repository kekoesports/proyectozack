import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { env } from '@/lib/env';
import {
  fetchYouTubeSubscribers,
  fetchTwitchFollowers,
  getTwitchToken,
  formatCount,
} from '@/lib/sync/syncMetrics';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type SocialRow = {
  id: number; talent_id: number; platform: string; handle: string;
  profile_url: string | null; followers_display: string; platform_id: string | null;
  name: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const sql = neon(env.DATABASE_URL);
  const today = new Date().toISOString().slice(0, 10);

  const ytKey   = env.YOUTUBE_API_KEY;
  const twId    = env.TWITCH_CLIENT_ID;
  const twSec   = env.TWITCH_CLIENT_SECRET;

  const hasYT = !!ytKey;
  const hasTW = !!(twId && twSec);

  const rows = await sql`
    SELECT ts.id, ts.talent_id, ts.platform, ts.handle, ts.profile_url,
           ts.followers_display, ts.platform_id, t.name
    FROM talent_socials ts
    JOIN talents t ON t.id = ts.talent_id
    WHERE ts.platform IN ('youtube', 'twitch')
    ORDER BY ts.platform, t.name
  ` as SocialRow[];

  const ytRows = rows.filter(r => r.platform === 'youtube');
  const twRows = rows.filter(r => r.platform === 'twitch');

  let twitchToken: string | null = null;
  if (hasTW && twId && twSec) {
    try {
      twitchToken = await getTwitchToken(twId, twSec);
    } catch (err) {
      console.error('[sync-metrics] Twitch auth failed:', (err as Error).message);
    }
  }

  type Result = {
    id: number; name: string; platform: string;
    status: 'updated' | 'unchanged' | 'failed' | 'skipped';
    newDisplay?: string | undefined; newPlatformId?: string | undefined;
  };

  const results: Result[] = [];

  async function processRow(row: SocialRow): Promise<void> {
    if (row.platform === 'youtube' && !hasYT) {
      results.push({ id: row.id, name: row.name, platform: row.platform, status: 'skipped' });
      return;
    }
    if (row.platform === 'twitch' && !twitchToken) {
      results.push({ id: row.id, name: row.name, platform: row.platform, status: 'skipped' });
      return;
    }

    try {
      let fetched: { count: number; platformId: string } | null = null;

      if (row.platform === 'youtube' && ytKey) {
        const r = await fetchYouTubeSubscribers(row.profile_url, row.handle, ytKey);
        if (r) fetched = { count: r.count, platformId: r.channelId };
      } else if (row.platform === 'twitch' && twId && twitchToken) {
        const r = await fetchTwitchFollowers(row.profile_url, row.handle, twId, twitchToken);
        if (r) fetched = { count: r.count, platformId: r.userId };
      }

      if (!fetched) {
        results.push({ id: row.id, name: row.name, platform: row.platform, status: 'failed' });
        return;
      }

      const newDisplay = formatCount(fetched.count);
      const platformIdChanged = fetched.platformId && fetched.platformId !== row.platform_id;
      const displayChanged = newDisplay !== row.followers_display;

      if (!displayChanged && !platformIdChanged) {
        results.push({ id: row.id, name: row.name, platform: row.platform, status: 'unchanged' });
        return;
      }

      // Write to DB
      if (platformIdChanged) {
        await sql`UPDATE talent_socials SET followers_display = ${newDisplay}, platform_id = ${fetched.platformId} WHERE id = ${row.id}`;
      } else {
        await sql`UPDATE talent_socials SET followers_display = ${newDisplay} WHERE id = ${row.id}`;
      }

      await sql`UPDATE talents SET last_stats_update_at = NOW() WHERE id = ${row.talent_id}`;

      const metricType = row.platform === 'youtube' ? 'subscribers' : 'followers';
      const dataSource = row.platform === 'youtube' ? 'youtube_api' : 'twitch_api';
      try {
        await sql`
          INSERT INTO talent_metric_snapshots
            (talent_id, platform, metric_type, value, snapshot_date, data_source)
          VALUES
            (${row.talent_id}, ${row.platform}, ${metricType}, ${fetched.count}, ${today}, ${dataSource})
          ON CONFLICT (talent_id, platform, metric_type, snapshot_date)
          DO UPDATE SET value = EXCLUDED.value, data_source = EXCLUDED.data_source
        `;
      } catch {}

      results.push({
        id: row.id, name: row.name, platform: row.platform, status: 'updated',
        newDisplay,
        newPlatformId: platformIdChanged ? fetched.platformId : undefined,
      });

    } catch (err) {
      console.error(`[sync-metrics] error for ${row.name} [${row.platform}]:`, (err as Error).message);
      results.push({ id: row.id, name: row.name, platform: row.platform, status: 'failed' });
    }

    await new Promise(r => setTimeout(r, 150));
  }

  for (const row of [...ytRows, ...twRows]) {
    await processRow(row);
  }

  const updated  = results.filter(r => r.status === 'updated').length;
  const failed   = results.filter(r => r.status === 'failed').length;
  const skipped  = results.filter(r => r.status === 'skipped').length;
  const unchanged = results.filter(r => r.status === 'unchanged').length;

  const failedNames = results.filter(r => r.status === 'failed').map(r => `${r.name} [${r.platform}]`);

  console.log(`[sync-metrics] done: ${updated} updated, ${unchanged} unchanged, ${failed} failed, ${skipped} skipped (no creds)`);
  if (failedNames.length > 0) {
    console.warn(`[sync-metrics] failed channels:`, failedNames.join(', '));
  }

  return NextResponse.json({
    success: true,
    date: today,
    stats: {
      youtube: { enabled: hasYT, rows: ytRows.length },
      twitch: { enabled: hasTW && !!twitchToken, rows: twRows.length },
    },
    results: { updated, unchanged, failed, skipped },
    failedChannels: failedNames,
  });
}
