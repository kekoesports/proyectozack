/**
 * fetch-talent-avatars.ts — Fetch and persist avatars for talents missing photos.
 *
 * Strategy per talent with `photo_url IS NULL`:
 *   1. Look up their socials (twitch + youtube preferred).
 *   2. Try Twitch first via unavatar.io. If the result is the well-known Twitch
 *      default logo (sha256 below), discard and try YouTube.
 *   3. Save the chosen image to `public/images/talents/{slug}.{ext}`.
 *   4. Update `talents.photo_url` with the relative URL.
 *
 * Run: npx tsx scripts/fetch-talent-avatars.ts [--dry-run] [--only=slug1,slug2]
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// Twitch default avatar logo (purple "twitch" wordmark). Returned by unavatar.io
// when the user has no custom Twitch avatar.
const TWITCH_DEFAULT_SHA256 = 'a4180307e9d6947d5df679b418c85befed6464d05928f8d659624bf8694fa741';

const TARGETS_DIR = join(process.cwd(), 'public', 'images', 'talents');

// Order matters: try in this order, skip default-logo results.
const PLATFORM_PRIORITY: ReadonlyArray<{ readonly key: string; readonly slug: string }> = [
  { key: 'twitch', slug: 'twitch' },
  { key: 'yt', slug: 'youtube' },
  { key: 'youtube', slug: 'youtube' },
];

// ── Env loader ────────────────────────────────────────────────

function loadEnv(): void {
  try {
    const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch (err) {
    console.error('[env] could not load .env.local:', err instanceof Error ? err.message : err);
  }
}

// ── CLI args ──────────────────────────────────────────────────

function parseArgs(): { readonly dryRun: boolean; readonly only: ReadonlySet<string> | null } {
  const dryRun = process.argv.includes('--dry-run');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean)) : null;
  return { dryRun, only };
}

// ── Helpers ───────────────────────────────────────────────────

function extFromContentType(ct: string | null): string {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

/** Strip leading @ and trim trailing path bits — unavatar wants raw handle. */
function normaliseHandle(raw: string): string {
  let h = raw.trim();
  if (h.startsWith('@')) h = h.slice(1);
  // Strip URL paths if someone stored a full URL
  const slashIdx = h.indexOf('/');
  if (slashIdx > -1) h = h.slice(0, slashIdx);
  return h;
}

type Social = { readonly platform: string; readonly handle: string; readonly profileUrl: string | null };

type Candidate = {
  readonly platformLabel: string;
  readonly handle: string;
  readonly bytes: Buffer;
  readonly contentType: string | null;
  readonly sha: string;
};

async function tryFetch(platformSlug: string, handle: string): Promise<Candidate | null> {
  const cleanHandle = normaliseHandle(handle);
  if (!cleanHandle) return null;

  const url = `https://unavatar.io/${platformSlug}/${encodeURIComponent(cleanHandle)}?fallback=false`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 1024) return null; // junk / empty
    const sha = createHash('sha256').update(buf).digest('hex');
    return {
      platformLabel: platformSlug,
      handle: cleanHandle,
      bytes: buf,
      contentType: res.headers.get('content-type'),
      sha,
    };
  } catch (err) {
    console.error(`  fetch err ${platformSlug}/${cleanHandle}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function isTwitchDefault(c: Candidate): boolean {
  return c.platformLabel === 'twitch' && c.sha === TWITCH_DEFAULT_SHA256;
}

// ── Main ──────────────────────────────────────────────────────

type TalentRow = {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly socials: ReadonlyArray<Social>;
};

async function main(): Promise<void> {
  loadEnv();
  const { dryRun, only } = parseArgs();

  if (dryRun) console.log('[dry-run] no DB or filesystem changes will be made\n');
  if (only) console.log(`[only] limiting to slugs: ${[...only].join(', ')}\n`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set in .env.local');
    process.exit(1);
  }

  const sql = neon(dbUrl);

  const rows = (await sql`
    SELECT t.id, t.slug, t.name, t.photo_url AS "photoUrl",
           COALESCE(
             json_agg(
               json_build_object('platform', s.platform, 'handle', s.handle, 'profileUrl', s.profile_url)
               ORDER BY s.sort_order
             ) FILTER (WHERE s.id IS NOT NULL),
             '[]'::json
           ) AS socials
    FROM talents t
    LEFT JOIN talent_socials s ON s.talent_id = t.id
    WHERE t.photo_url IS NULL
    GROUP BY t.id
    ORDER BY t.name
  `) as unknown as ReadonlyArray<TalentRow>;

  const filtered = only ? rows.filter((r) => only.has(r.slug)) : rows;

  console.log(`Talents missing photo: ${rows.length} (processing: ${filtered.length})\n`);

  if (!dryRun && !existsSync(TARGETS_DIR)) {
    mkdirSync(TARGETS_DIR, { recursive: true });
  }

  const results = { ok: 0, skipped: 0, failed: 0 };

  for (const t of filtered) {
    console.log(`→ ${t.name} (${t.slug}) [id=${t.id}]`);

    if (!Array.isArray(t.socials) || t.socials.length === 0) {
      console.log('  SKIP — no socials');
      results.skipped++;
      continue;
    }

    let chosen: Candidate | null = null;
    let firstFallback: Candidate | null = null;

    for (const { key, slug: platformSlug } of PLATFORM_PRIORITY) {
      const social = t.socials.find((s) => s.platform === key);
      if (!social) continue;

      const cand = await tryFetch(platformSlug, social.handle);
      if (!cand) {
        console.log(`  · ${platformSlug}/${social.handle}: no response`);
        continue;
      }
      if (isTwitchDefault(cand)) {
        console.log(`  · ${platformSlug}/${social.handle}: default logo (skip, try next)`);
        if (!firstFallback) firstFallback = cand;
        continue;
      }

      console.log(`  · ${platformSlug}/${social.handle}: ${cand.bytes.length} B (${cand.contentType ?? '?'}) — chosen`);
      chosen = cand;
      break;
    }

    const finalCandidate = chosen ?? firstFallback;
    if (!finalCandidate) {
      console.log('  FAIL — no usable avatar');
      results.failed++;
      continue;
    }

    const ext = extFromContentType(finalCandidate.contentType);
    const filename = `${t.slug}.${ext}`;
    const fullPath = join(TARGETS_DIR, filename);
    const publicUrl = `/images/talents/${filename}`;

    if (dryRun) {
      console.log(`  [dry-run] would write ${fullPath} (${finalCandidate.bytes.length} B) and set photo_url=${publicUrl}`);
      results.ok++;
      continue;
    }

    try {
      writeFileSync(fullPath, finalCandidate.bytes);
      await sql`UPDATE talents SET photo_url = ${publicUrl} WHERE id = ${t.id}`;
      console.log(`  ✓ wrote ${publicUrl}`);
      results.ok++;
    } catch (err) {
      console.error('  ERR while saving:', err instanceof Error ? err.message : err);
      results.failed++;
    }
  }

  console.log('\nDone.');
  console.log(`  OK     : ${results.ok}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`  Failed : ${results.failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
