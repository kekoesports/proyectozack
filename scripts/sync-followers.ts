/**
 * Sync real follower counts from YouTube and Twitch APIs.
 * Updates followers_display in talent_socials for all youtube and twitch rows.
 *
 * Run:          npx tsx scripts/sync-followers.ts --dry-run   ← preview only
 * Real sync:    npx tsx scripts/sync-followers.ts             ← writes to DB
 *
 * Skips: instagram, tiktok, x, kick (no reliable API yet)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {}

// ── Config ───────────────────────────────────────────────────────────────────
const DRY_RUN       = process.argv.includes('--dry-run');
const YT_API_KEY    = process.env.YOUTUBE_API_KEY ?? '';
const TW_CLIENT_ID  = process.env.TWITCH_CLIENT_ID ?? '';
const TW_SECRET     = process.env.TWITCH_CLIENT_SECRET ?? '';
const DATABASE_URL  = process.env.DATABASE_URL ?? '';

// Thresholds for warnings
const WARN_CHANGE_PCT  = 30;  // warn if change > 30%
const WARN_DROP_PCT    = 20;  // warn specifically if drop > 20% (suspicious)

if (!DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1); }

// ── Format helpers ────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${parseFloat((n / 1_000_000).toFixed(1))}M`;
  if (n >= 1_000)     return `${parseFloat((n / 1_000).toFixed(1))}K`;
  return String(n);
}

/** Parse display string to raw number for % comparison. Returns null if not parseable. */
function parseDisplay(s: string): number | null {
  if (!s || s === '-' || s === '—') return null;
  const m = s.match(/^([\d.]+)([KkMm]?)$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const mul = m[2].toUpperCase() === 'K' ? 1000 : m[2].toUpperCase() === 'M' ? 1_000_000 : 1;
  return num * mul;
}

function pct(oldVal: number, newVal: number): string {
  if (oldVal === 0) return '+∞';
  const diff = ((newVal - oldVal) / oldVal) * 100;
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
}

// ── YouTube ───────────────────────────────────────────────────────────────────

function parseYouTubeUrl(profileUrl: string): { type: string; value: string } | null {
  try {
    const url = new URL(profileUrl);
    const path = url.pathname.replace(/\/$/, '')
      .replace(/\/videos$/, '').replace(/\/featured$/, '').replace(/\/about$/, '');

    const channelMatch = path.match(/^\/channel\/(UC[\w-]+)$/);
    if (channelMatch) return { type: 'id', value: channelMatch[1] };

    const handleMatch = path.match(/^\/@([\w.-]+)$/);
    if (handleMatch) return { type: 'handle', value: `@${handleMatch[1]}` };

    const customMatch = path.match(/^\/c\/([\w.-]+)$/);
    if (customMatch) return { type: 'custom', value: customMatch[1] };

    const userMatch = path.match(/^\/user\/([\w.-]+)$/);
    if (userMatch) return { type: 'username', value: userMatch[1] };

    const rawMatch = path.match(/^\/([\w.-]+)$/);
    if (rawMatch) return { type: 'custom', value: rawMatch[1] };

    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeSubscribers(profileUrl: string, handle: string): Promise<{ count: number; channelId: string | null } | null> {
  if (!YT_API_KEY) return null;

  const parsed = profileUrl ? parseYouTubeUrl(profileUrl) : null;

  // If handle starts with UC, it's already a channel ID
  const directId = handle.startsWith('UC') ? handle : null;

  const base = 'https://www.googleapis.com/youtube/v3/channels';

  async function tryFetch(param: string, paramType: string): Promise<{ count: number; channelId: string } | null> {
    const url = `${base}?part=statistics,id&${paramType}=${encodeURIComponent(param)}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { items?: { id?: string; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }[] };
    const item = data.items?.[0];
    if (!item) return null;
    if (item.statistics?.hiddenSubscriberCount) return null;
    const count = item.statistics?.subscriberCount;
    if (!count) return null;
    return { count: parseInt(count, 10), channelId: item.id ?? '' };
  }

  // Try in order: direct ID → profile_url → handle as @handle → handle as forUsername
  if (directId) {
    const r = await tryFetch(directId, 'id');
    if (r) return { count: r.count, channelId: r.channelId };
  }

  if (parsed) {
    const paramType = parsed.type === 'id' ? 'id' : parsed.type === 'handle' ? 'forHandle' : 'forUsername';
    const r = await tryFetch(parsed.value, paramType);
    if (r) return { count: r.count, channelId: r.channelId };
  }

  // Fallback: treat handle as @handle
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (cleanHandle && !cleanHandle.startsWith('http')) {
    const r = await tryFetch(`@${cleanHandle}`, 'forHandle');
    if (r) return { count: r.count, channelId: r.channelId };
    const r2 = await tryFetch(cleanHandle, 'forUsername');
    if (r2) return { count: r2.count, channelId: r2.channelId };
  }

  return null;
}

// ── Twitch ────────────────────────────────────────────────────────────────────

async function getTwitchToken(): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TW_CLIENT_ID}&client_secret=${TW_SECRET}&grant_type=client_credentials`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Twitch token error: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function parseTwitchLogin(profileUrl: string | null, handle: string): string | null {
  // Handle is sometimes "twitch.tv/name" or full URL
  if (handle && !handle.startsWith('http') && !handle.includes('/') && handle.length > 0 && handle !== 'about') {
    return handle.replace(/^@/, '').toLowerCase();
  }
  const urlToParse = profileUrl || (handle.startsWith('http') ? handle : null) || (handle.includes('/') ? `https://${handle}` : null);
  if (urlToParse) {
    try {
      const url = new URL(urlToParse.startsWith('http') ? urlToParse : `https://${urlToParse}`);
      const path = url.pathname.replace(/\/$/, '')
        .replace(/\/(about|videos|clips|schedule|squad|followers)$/, '');
      const match = path.match(/^\/([\w]+)$/);
      if (match) return match[1].toLowerCase();
    } catch {}
  }
  return null;
}

async function fetchTwitchFollowers(token: string, profileUrl: string | null, handle: string): Promise<{ count: number; userId: string } | null> {
  const login = parseTwitchLogin(profileUrl, handle);
  if (!login) return null;

  const userRes = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
    { headers: { 'Client-ID': TW_CLIENT_ID, 'Authorization': `Bearer ${token}` } },
  );
  if (!userRes.ok) return null;
  const userData = await userRes.json() as { data?: { id: string }[] };
  const userId = userData.data?.[0]?.id;
  if (!userId) return null;

  const follRes = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`,
    { headers: { 'Client-ID': TW_CLIENT_ID, 'Authorization': `Bearer ${token}` } },
  );
  if (!follRes.ok) return null;
  const follData = await follRes.json() as { total?: number };
  if (follData.total === undefined) return null;
  return { count: follData.total, userId };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sql = neon(DATABASE_URL);
  const today = new Date().toISOString().slice(0, 10);

  const mode = DRY_RUN ? '🔍 DRY RUN — no DB writes' : '✏️  LIVE SYNC — will write to DB';
  console.log(`\n${mode}\n${'─'.repeat(60)}`);

  // ── API key checks ───────────────────────────────────────────────────────
  const hasYT = !!YT_API_KEY;
  const hasTW = !!(TW_CLIENT_ID && TW_SECRET);
  console.log(`YouTube API key: ${hasYT ? '✅ set' : '❌ NOT SET — will skip YouTube'}`);
  console.log(`Twitch credentials: ${hasTW ? '✅ set' : '❌ NOT SET — will skip Twitch'}\n`);

  // ── Fetch rows — platform 'youtube' and 'twitch' (NOT 'yt'/'tw') ─────────
  type SocialRow = {
    id: number; talent_id: number; platform: string; handle: string;
    profile_url: string | null; followers_display: string;
    platform_id: string | null; name: string; slug: string;
  };

  const rows = await sql`
    SELECT ts.id, ts.talent_id, ts.platform, ts.handle,
           ts.profile_url, ts.followers_display, ts.platform_id,
           t.name, t.slug
    FROM talent_socials ts
    JOIN talents t ON t.id = ts.talent_id
    WHERE ts.platform IN ('youtube', 'twitch')
    ORDER BY ts.platform, t.name
  ` as SocialRow[];

  const ytRows = rows.filter(r => r.platform === 'youtube');
  const twRows = rows.filter(r => r.platform === 'twitch');
  console.log(`Rows to process: ${ytRows.length} YouTube + ${twRows.length} Twitch = ${rows.length} total\n`);

  // ── Warn about missing platformId ────────────────────────────────────────
  const missingPlatformId = rows.filter(r => !r.platform_id);
  if (missingPlatformId.length > 0) {
    console.log(`⚠️  ${missingPlatformId.length} rows missing platform_id (will try to resolve from URL/handle):`);
    missingPlatformId.forEach(r =>
      console.log(`   [${r.platform}] ${r.name} handle="${r.handle}" url="${r.profile_url ?? 'NULL'}"`)
    );
    console.log();
  }

  // ── Twitch auth ──────────────────────────────────────────────────────────
  let twitchToken: string | null = null;
  if (hasTW) {
    process.stdout.write('Authenticating with Twitch... ');
    try {
      twitchToken = await getTwitchToken();
      console.log('✅\n');
    } catch (err) {
      console.log(`❌ ${(err as Error).message} — skipping Twitch\n`);
    }
  }

  // ── Process rows ─────────────────────────────────────────────────────────
  const results: Array<{
    row: SocialRow;
    newCount: number | null;
    newDisplay: string | null;
    newPlatformId: string | null;
    status: 'update' | 'unchanged' | 'failed' | 'skipped';
    warning?: string;
  }> = [];

  for (const row of rows) {
    const tag = row.platform === 'youtube' ? '[YT]' : '[TW]';

    // Skip if no API credentials
    if (row.platform === 'youtube' && !hasYT) {
      results.push({ row, newCount: null, newDisplay: null, newPlatformId: null, status: 'skipped' });
      continue;
    }
    if (row.platform === 'twitch' && !twitchToken) {
      results.push({ row, newCount: null, newDisplay: null, newPlatformId: null, status: 'skipped' });
      continue;
    }

    process.stdout.write(`${tag} ${row.name} (${row.handle.slice(0, 30)})... `);

    let result: { count: number; platformId: string | null } | null = null;

    try {
      if (row.platform === 'youtube') {
        const r = await fetchYouTubeSubscribers(row.profile_url ?? '', row.handle);
        if (r) result = { count: r.count, platformId: r.channelId };
      } else {
        if (!twitchToken) { console.log('SKIPPED'); results.push({ row, newCount: null, newDisplay: null, newPlatformId: null, status: 'skipped' }); continue; }
        const r = await fetchTwitchFollowers(twitchToken, row.profile_url, row.handle);
        if (r) result = { count: r.count, platformId: r.userId };
      }
    } catch (err) {
      console.log(`ERROR (${(err as Error).message})`);
      results.push({ row, newCount: null, newDisplay: null, newPlatformId: null, status: 'failed' });
      continue;
    }

    if (!result) {
      console.log(`FAILED — cannot resolve channel`);
      results.push({ row, newCount: null, newDisplay: null, newPlatformId: null, status: 'failed' });
      continue;
    }

    const newDisplay = formatCount(result.count);
    const newPlatformId = result.platformId && result.platformId !== row.platform_id ? result.platformId : null;
    const oldNum = parseDisplay(row.followers_display);

    // Build warning if needed
    let warning: string | undefined;
    if (oldNum !== null) {
      const changePct = Math.abs(((result.count - oldNum) / oldNum) * 100);
      const drop = result.count < oldNum;
      if (changePct > WARN_CHANGE_PCT) {
        warning = `⚠️  Large change ${pct(oldNum, result.count)} (${row.followers_display} → ${newDisplay})`;
        if (drop && changePct > WARN_DROP_PCT) {
          warning = `🚨 SUSPICIOUS DROP ${pct(oldNum, result.count)} (${row.followers_display} → ${newDisplay}) — verify manually`;
        }
      }
    }

    const displayChanged = newDisplay !== row.followers_display;
    const platformIdChanged = !!newPlatformId;

    if (!displayChanged && !platformIdChanged) {
      console.log(`unchanged (${newDisplay})`);
      results.push({ row, newCount: result.count, newDisplay, newPlatformId: null, status: 'unchanged' });
    } else {
      const changes: string[] = [];
      if (displayChanged) changes.push(`${row.followers_display} → ${newDisplay}`);
      if (platformIdChanged) changes.push(`platformId: ${row.platform_id ?? 'null'} → ${newPlatformId}`);
      console.log(changes.join(' | '));
      if (warning) console.log(`   ${warning}`);
      results.push({ row, newCount: result.count, newDisplay, newPlatformId, status: 'update', warning });
    }

    await new Promise(r => setTimeout(r, 150)); // gentle rate limiting
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const toUpdate  = results.filter(r => r.status === 'update');
  const unchanged = results.filter(r => r.status === 'unchanged');
  const failed    = results.filter(r => r.status === 'failed');
  const skipped   = results.filter(r => r.status === 'skipped');
  const warnings  = results.filter(r => r.warning);

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   ${toUpdate.length} to update`);
  console.log(`   ${unchanged.length} unchanged`);
  console.log(`   ${failed.length} failed`);
  console.log(`   ${skipped.length} skipped (no API key)`);

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(r => console.log(`   ${r.warning} — ${r.row.name} [${r.row.platform}]`));
  }

  if (toUpdate.length > 0) {
    console.log(`\n✏️  Proposed updates:`);
    toUpdate.forEach(r => {
      const parts = [];
      if (r.newDisplay !== r.row.followers_display) parts.push(`followers: ${r.row.followers_display} → ${r.newDisplay}`);
      if (r.newPlatformId) parts.push(`platformId: ${r.row.platform_id ?? 'null'} → ${r.newPlatformId}`);
      console.log(`   ${r.row.name} [${r.row.platform}] — ${parts.join(' | ')}${r.warning ? ' ← ' + r.warning : ''}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN complete — no changes written.');
    console.log('Remove --dry-run to apply changes.\n');
    return;
  }

  // ── Apply updates ─────────────────────────────────────────────────────────
  if (toUpdate.length === 0) {
    console.log('\n✅ Nothing to update.\n');
    return;
  }

  console.log(`\nApplying ${toUpdate.length} updates...`);
  let applied = 0;

  for (const r of toUpdate) {
    if (r.newDisplay === null) continue;

    // 1. Update followers_display (and platformId if newly resolved)
    if (r.newPlatformId) {
      await sql`
        UPDATE talent_socials
        SET followers_display = ${r.newDisplay}, platform_id = ${r.newPlatformId}
        WHERE id = ${r.row.id}
      `;
    } else {
      await sql`
        UPDATE talent_socials
        SET followers_display = ${r.newDisplay}
        WHERE id = ${r.row.id}
      `;
    }

    // 2. Update lastStatsUpdateAt on the talent
    await sql`
      UPDATE talents SET last_stats_update_at = NOW()
      WHERE id = ${r.row.talent_id}
    `;

    // 3. Insert snapshot with dataSource
    const metricType = r.row.platform === 'youtube' ? 'subscribers' : 'followers';
    const dataSource = r.row.platform === 'youtube' ? 'youtube_api' : 'twitch_api';
    try {
      await sql`
        INSERT INTO talent_metric_snapshots
          (talent_id, platform, metric_type, value, snapshot_date, data_source)
        VALUES
          (${r.row.talent_id}, ${r.row.platform}, ${metricType}, ${r.newCount!}, ${today}, ${dataSource})
        ON CONFLICT (talent_id, platform, metric_type, snapshot_date)
        DO UPDATE SET value = EXCLUDED.value, data_source = EXCLUDED.data_source
      `;
    } catch {
      // Snapshot insert failure is non-fatal
    }

    applied++;
    console.log(`  ✅ ${r.row.name} [${r.row.platform}] → ${r.newDisplay}`);
  }

  console.log(`\n✅ Done: ${applied} records updated, ${failed.length} failed, ${unchanged.length} unchanged.\n`);
}

main().catch(err => { console.error('\nFatal error:', err); process.exit(1); });
