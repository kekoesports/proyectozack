/**
 * Fix 7 social handles that fail against YouTube/Twitch APIs.
 *
 * Run with real DB:
 *   DATABASE_URL="postgres://..." npx tsx scripts/fix-handles.ts --dry-run
 *   DATABASE_URL="postgres://..." npx tsx scripts/fix-handles.ts
 *
 * Or set DATABASE_URL in .env.local and run:
 *   npx tsx scripts/fix-handles.ts --dry-run
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {}

const DRY_RUN = process.argv.includes('--dry-run');
const DATABASE_URL = process.env.DATABASE_URL ?? '';
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1); }

// ── Fixes ──────────────────────────────────────────────────────────────────────
// Each entry targets rows by talent name + platform.
// "platform_fix" renames tw→twitch or yt→youtube when the row was saved with the
// old short key and therefore gets skipped by the sync script.

type Fix = {
  talentName:   string;
  platform:     string;          // platform currently in DB (may be 'tw'/'yt')
  platformFix?: string;          // rename to this value if set
  handle?:      string;          // new handle (leave undefined to keep)
  profileUrl?:  string;          // new profile_url (leave undefined to keep)
  note:         string;
};

const FIXES: Fix[] = [
  // MARTINEZ — YouTube handle is MartiinezSa, not martinezsaa
  {
    talentName: 'MARTINEZ',
    platform:   'youtube',
    handle:     'MartiinezSa',
    profileUrl: 'https://www.youtube.com/@MartiinezSa',
    note:       'YouTube handle corrected: martinezsaa → MartiinezSa',
  },
  // Also try old short-key form in case row was stored as 'yt'
  {
    talentName:   'MARTINEZ',
    platform:     'yt',
    platformFix:  'youtube',
    handle:       'MartiinezSa',
    profileUrl:   'https://www.youtube.com/@MartiinezSa',
    note:         'MARTINEZ yt→youtube platform rename + handle fix',
  },

  // ADAMS — Twitch login is adamsen_, not ADAMS
  {
    talentName: 'ADAMS',
    platform:   'twitch',
    handle:     'adamsen_',
    profileUrl: 'https://www.twitch.tv/adamsen_',
    note:       'Twitch handle corrected: ADAMS → adamsen_',
  },
  {
    talentName:  'ADAMS',
    platform:    'tw',
    platformFix: 'twitch',
    handle:      'adamsen_',
    profileUrl:  'https://www.twitch.tv/adamsen_',
    note:        'ADAMS tw→twitch platform rename + handle fix',
  },

  // Lewis cs2 — space in handle, real login is lewiscs2_
  {
    talentName: 'Lewis cs2',
    platform:   'twitch',
    handle:     'lewiscs2_',
    profileUrl: 'https://www.twitch.tv/lewiscs2_',
    note:       'Twitch handle corrected: "Lewis cs2" (space) → lewiscs2_',
  },
  {
    talentName:  'Lewis cs2',
    platform:    'tw',
    platformFix: 'twitch',
    handle:      'lewiscs2_',
    profileUrl:  'https://www.twitch.tv/lewiscs2_',
    note:        'Lewis cs2 tw→twitch platform rename + handle fix',
  },

  // Bosko — player Francisco "bosko" Bosco, Twitch login is bosco
  {
    talentName: 'Bosko',
    platform:   'twitch',
    handle:     'bosco',
    profileUrl: 'https://www.twitch.tv/bosco',
    note:       'Twitch handle corrected: Bosko → bosco (verify manually)',
  },
  {
    talentName:  'Bosko',
    platform:    'tw',
    platformFix: 'twitch',
    handle:      'bosco',
    profileUrl:  'https://www.twitch.tv/bosco',
    note:        'Bosko tw→twitch rename + handle fix',
  },

  // Branuel — handle branuel is correct; fix in case platform was stored as 'tw'
  {
    talentName:  'Branuel',
    platform:    'tw',
    platformFix: 'twitch',
    handle:      'branuel',
    profileUrl:  'https://www.twitch.tv/branuel',
    note:        'Branuel tw→twitch platform rename',
  },

  // Marinho — handle marinho is correct; fix in case platform was stored as 'tw'
  {
    talentName:  'Marinho',
    platform:    'tw',
    platformFix: 'twitch',
    handle:      'marinho',
    profileUrl:  'https://www.twitch.tv/marinho',
    note:        'Marinho tw→twitch platform rename',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sql = neon(DATABASE_URL);
  const mode = DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE';
  console.log(`\n${mode} — fix-handles\n${'─'.repeat(60)}`);

  type Row = {
    id: number; talent_id: number; platform: string; handle: string;
    profile_url: string | null; name: string;
  };

  for (const fix of FIXES) {
    const rows = await sql`
      SELECT ts.id, ts.talent_id, ts.platform, ts.handle, ts.profile_url, t.name
      FROM talent_socials ts
      JOIN talents t ON t.id = ts.talent_id
      WHERE t.name = ${fix.talentName}
        AND ts.platform = ${fix.platform}
    ` as Row[];

    if (rows.length === 0) {
      // Row doesn't exist with this platform key — skip silently
      continue;
    }

    for (const row of rows) {
      const newPlatform = fix.platformFix ?? row.platform;
      const newHandle   = fix.handle      ?? row.handle;
      const newUrl      = fix.profileUrl  ?? row.profile_url;

      const changes: string[] = [];
      if (newPlatform !== row.platform) changes.push(`platform: ${row.platform} → ${newPlatform}`);
      if (newHandle   !== row.handle)   changes.push(`handle: ${row.handle} → ${newHandle}`);
      if (newUrl      !== row.profile_url) changes.push(`url: ${row.profile_url ?? 'null'} → ${newUrl}`);

      if (changes.length === 0) {
        console.log(`  ✓ ${fix.talentName} [${fix.platform}] — already correct, no changes`);
        continue;
      }

      console.log(`  ${DRY_RUN ? '→' : '✅'} ${fix.talentName} [${fix.platform}] — ${changes.join(' | ')}`);
      if (!DRY_RUN) {
        await sql`
          UPDATE talent_socials
          SET platform    = ${newPlatform},
              handle      = ${newHandle},
              profile_url = ${newUrl}
          WHERE id = ${row.id}
        `;
      }
    }
  }

  // ── Report julietacs_ YouTube — manual action needed ──────────────────────
  console.log('\n─'.repeat(60));
  console.log('⚠️  julietacs_ (YouTube) — acción manual requerida:');
  console.log('   No se encontró canal de YouTube con ese handle.');
  console.log('   Opciones:');
  console.log('   a) Si tiene canal de YouTube, actualiza el handle/URL en /admin/talents/{id}');
  console.log('   b) Si solo está en Twitch, elimina la fila de youtube en talent_socials');

  // Show current state
  const julietRows = await sql`
    SELECT ts.id, ts.platform, ts.handle, ts.profile_url
    FROM talent_socials ts
    JOIN talents t ON t.id = ts.talent_id
    WHERE t.name ILIKE '%juliet%'
    ORDER BY ts.platform
  ` as { id: number; platform: string; handle: string; profile_url: string | null }[];

  if (julietRows.length > 0) {
    console.log('\n   Estado actual en DB:');
    julietRows.forEach(r =>
      console.log(`   [${r.platform}] handle="${r.handle}" url="${r.profile_url ?? 'NULL'}"`)
    );
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no changes written. Remove --dry-run to apply.\n');
  } else {
    console.log('\n✅ Done. Run sync-followers.ts --dry-run to verify.\n');
  }
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1); });
