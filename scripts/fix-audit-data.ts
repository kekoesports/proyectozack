/**
 * Fix datos rotos detectados en auditoría junio 2026:
 * - Discord URLs sin https:// (ej: JOLU)
 * - Twitch URLs con /about sobrante (ej: ERUBY)
 * - RINNA followersDisplay "21,6 Seguidores" → "21.6K"
 * - DEQIUV stat duplicada 464K cuando ya existe 464.2K
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, like, and } from 'drizzle-orm';
import * as schema from '@/db/schema';

// Load .env.local (tsx/node don't auto-load it)
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
} catch { /* ignore */ }

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const db = drizzle(neon(url!), { schema });

async function fixAll(): Promise<void> {
  const { talentSocials, rankingEntries } = schema;

  // 1. Discord URLs sin https:// (ej: "discord.gg/xxx" → "https://discord.gg/xxx")
  const badDiscords = await db
    .select()
    .from(talentSocials)
    .where(and(
      eq(talentSocials.platform, 'discord'),
      like(talentSocials.profileUrl, 'discord.gg%'),
    ));
  for (const row of badDiscords) {
    const fixed = `https://${row.profileUrl}`;
    await db.update(talentSocials).set({ profileUrl: fixed }).where(eq(talentSocials.id, row.id));
    console.log(`Discord fix (id=${row.id}): ${row.profileUrl} → ${fixed}`);
  }
  if (badDiscords.length === 0) console.log('Discord URLs: OK (no bare discord.gg found)');

  // 2. Twitch URLs con /about (ej: "https://twitch.tv/eruby/about" → "https://twitch.tv/eruby")
  const badTwitchs = await db
    .select()
    .from(talentSocials)
    .where(and(
      eq(talentSocials.platform, 'twitch'),
      like(talentSocials.profileUrl, '%/about'),
    ));
  for (const row of badTwitchs) {
    const fixed = (row.profileUrl ?? '').replace(/\/about$/, '');
    await db.update(talentSocials).set({ profileUrl: fixed }).where(eq(talentSocials.id, row.id));
    console.log(`Twitch/about fix (id=${row.id}): ${row.profileUrl} → ${fixed}`);
  }
  if (badTwitchs.length === 0) console.log('Twitch /about URLs: OK (none found)');

  // 3. RINNA: "21,6 Seguidores" → "21.6K"
  const rinnaRows = await db
    .select()
    .from(talentSocials)
    .where(eq(talentSocials.followersDisplay, '21,6 Seguidores'));
  for (const row of rinnaRows) {
    await db.update(talentSocials).set({ followersDisplay: '21.6K' }).where(eq(talentSocials.id, row.id));
    console.log(`RINNA fix (id=${row.id}): "21,6 Seguidores" → "21.6K"`);
  }
  if (rinnaRows.length === 0) console.log('RINNA stat: OK (not found)');

  // 4. DEQIUV: eliminar "464K" si el mismo talento ya tiene "464.2K"
  const dup464k = await db
    .select()
    .from(talentSocials)
    .where(eq(talentSocials.followersDisplay, '464K'));
  for (const row of dup464k) {
    const sibling = await db
      .select({ id: talentSocials.id })
      .from(talentSocials)
      .where(and(
        eq(talentSocials.talentId, row.talentId),
        eq(talentSocials.followersDisplay, '464.2K'),
      ))
      .limit(1);
    if (sibling.length > 0) {
      await db.delete(talentSocials).where(eq(talentSocials.id, row.id));
      console.log(`DEQIUV fix: deleted duplicate "464K" (id=${row.id})`);
    } else {
      console.log(`DEQIUV: "464K" (id=${row.id}) has no 464.2K sibling — skipping`);
    }
  }
  if (dup464k.length === 0) console.log('DEQIUV duplicate: OK (464K not found)');

  // 5. Comma-decimal followersDisplay without "K" suffix (ej: "21,6" → "21.6K")
  const commaStats = await db
    .select()
    .from(talentSocials)
    .where(like(talentSocials.followersDisplay, '%,%'));
  for (const row of commaStats) {
    if (!row.followersDisplay) continue;
    // Only fix plain comma-decimal values like "21,6" or "71,4"
    const fixed = row.followersDisplay.replace(/^(\d+),(\d+)$/, '$1.$2K');
    if (fixed !== row.followersDisplay) {
      await db.update(talentSocials).set({ followersDisplay: fixed }).where(eq(talentSocials.id, row.id));
      console.log(`Comma-decimal fix (id=${row.id}): "${row.followersDisplay}" → "${fixed}"`);
    }
  }
  if (commaStats.length === 0) console.log('Comma-decimal stats: OK (none found)');

  // 6. Ranking logos: clear hotlinks from seeklogo.com / liquipedia
  const hotlinkedLogos = await db
    .select()
    .from(rankingEntries)
    .where(
      and(
        // Not null
        like(rankingEntries.teamLogo, 'http%'),
      ),
    );
  const ALLOWED_DOMAINS = ['socialpro.es', 'vercel.app', 'blob.vercel-storage.com', 'localhost'];
  for (const row of hotlinkedLogos) {
    if (!row.teamLogo) continue;
    try {
      const { hostname } = new URL(row.teamLogo);
      const isAllowed = ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
      if (!isAllowed) {
        await db.update(rankingEntries).set({ teamLogo: null }).where(eq(rankingEntries.id, row.id));
        console.log(`Ranking logo removed (hotlink) id=${row.id} "${row.teamName}": ${row.teamLogo}`);
      }
    } catch { /* skip invalid URLs */ }
  }

  console.log('\nAudit data fixes complete.');
}

fixAll().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
