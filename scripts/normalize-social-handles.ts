/**
 * Normalizes YouTube/Twitch social entries where the `handle` field
 * contains a full URL instead of just the channel handle.
 *
 * This happens when the admin pastes a profile URL into the handle field
 * and leaves profile_url blank.
 *
 * Dry-run (default): npx tsx scripts/normalize-social-handles.ts --dry-run
 * Apply changes:     npx tsx scripts/normalize-social-handles.ts
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

const DRY_RUN     = process.argv.includes('--dry-run');
const DATABASE_URL = process.env.DATABASE_URL ?? '';
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1); }

// ── URL extractors ────────────────────────────────────────────────────────────

function extractYouTubeHandle(raw: string): { handle: string; cleanUrl: string } | null {
  try {
    const fullUrl = raw.startsWith('http') ? raw : `https://${raw}`;
    const u = new URL(fullUrl);
    const path = u.pathname
      .replace(/\/$/, '')
      .replace(/\/(videos|featured|about|playlists|community|shorts|streams|live)$/, '');

    const handleMatch = path.match(/^\/@([\w.-]+)$/);
    if (handleMatch) return {
      handle: handleMatch[1],
      cleanUrl: `https://www.youtube.com/@${handleMatch[1]}`,
    };

    const customMatch = path.match(/^\/c\/([\w.-]+)$/);
    if (customMatch) return {
      handle: customMatch[1],
      cleanUrl: `https://www.youtube.com/@${customMatch[1]}`,
    };

    const userMatch = path.match(/^\/user\/([\w.-]+)$/);
    if (userMatch) return {
      handle: userMatch[1],
      cleanUrl: `https://www.youtube.com/@${userMatch[1]}`,
    };

    const rawMatch = path.match(/^\/([\w.-]+)$/);
    if (rawMatch && rawMatch[1] !== 'watch' && rawMatch[1] !== 'results') return {
      handle: rawMatch[1],
      cleanUrl: `https://www.youtube.com/@${rawMatch[1]}`,
    };

    return null;
  } catch {
    return null;
  }
}

function extractTwitchHandle(raw: string): { handle: string; cleanUrl: string } | null {
  const looksLikeUrl = raw.startsWith('http') || raw.includes('/');
  if (!looksLikeUrl) return null;

  try {
    const fullUrl = raw.startsWith('http') ? raw : `https://${raw}`;
    const u = new URL(fullUrl);
    const path = u.pathname
      .replace(/\/$/, '')
      .replace(/\/(about|videos|clips|schedule|squad|followers)$/, '');

    const match = path.match(/^\/([\w]+)$/);
    if (match) return {
      handle: match[1].toLowerCase(),
      cleanUrl: `https://www.twitch.tv/${match[1].toLowerCase()}`,
    };

    return null;
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Row = {
  id: number; talent_id: number; platform: string;
  handle: string; profile_url: string | null; name: string;
};

async function main() {
  const sql = neon(DATABASE_URL);
  const mode = DRY_RUN ? '🔍 DRY RUN — no DB writes' : '✏️  LIVE UPDATE — will write to DB';
  console.log(`\n${mode}\n${'─'.repeat(60)}`);

  // Rows where profile_url is NULL and handle looks like a URL
  const rows = await sql`
    SELECT ts.id, ts.talent_id, ts.platform, ts.handle, ts.profile_url, t.name
    FROM talent_socials ts
    JOIN talents t ON t.id = ts.talent_id
    WHERE ts.platform IN ('youtube', 'twitch')
      AND ts.profile_url IS NULL
      AND (ts.handle LIKE 'http%' OR ts.handle LIKE '%/%')
    ORDER BY ts.platform, t.name
  ` as Row[];

  console.log(`Found ${rows.length} rows with URL-in-handle:\n`);

  if (rows.length === 0) {
    console.log('✅ Nothing to normalize.\n');
    return;
  }

  const updates: Array<{
    id: number; name: string; platform: string;
    newHandle: string; newUrl: string; oldHandle: string;
  }> = [];
  const skipped: Row[] = [];

  for (const row of rows) {
    const extracted = row.platform === 'youtube'
      ? extractYouTubeHandle(row.handle)
      : extractTwitchHandle(row.handle);

    if (!extracted) {
      console.log(`⚠️  [${row.platform}] ${row.name}: cannot parse "${row.handle}" — skipped`);
      skipped.push(row);
      continue;
    }

    console.log(`[${row.platform}] ${row.name}:`);
    console.log(`   handle:  "${row.handle}" → "${extracted.handle}"`);
    console.log(`   url:     NULL → "${extracted.cleanUrl}"`);

    updates.push({
      id: row.id, name: row.name, platform: row.platform,
      newHandle: extracted.handle, newUrl: extracted.cleanUrl,
      oldHandle: row.handle,
    });
  }

  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN complete — ${updates.length} would be updated, ${skipped.length} skipped.`);
    console.log('Remove --dry-run to apply.\n');
    return;
  }

  console.log(`\nApplying ${updates.length} updates...`);
  for (const u of updates) {
    await sql`
      UPDATE talent_socials
      SET handle = ${u.newHandle}, profile_url = ${u.newUrl}
      WHERE id = ${u.id}
    `;
    console.log(`  ✅ [${u.platform}] ${u.name}: handle="${u.newHandle}", url="${u.newUrl}"`);
  }

  if (skipped.length > 0) {
    console.log(`\n⚠️  ${skipped.length} rows skipped (could not parse handle):`);
    skipped.forEach(r => console.log(`   [${r.platform}] ${r.name}: "${r.handle}"`));
  }

  console.log(`\n✅ Done: ${updates.length} rows normalized.\n`);
}

main().catch(err => { console.error('\nFatal error:', err); process.exit(1); });
