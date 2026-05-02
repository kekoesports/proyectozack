/**
 * fetch-talent-photos.ts
 *
 * Extrae fotos de perfil de Twitch y YouTube para talentos sin photoUrl.
 *
 * Uso:
 *   npx tsx scripts/fetch-talent-photos.ts            → solo sin foto
 *   npx tsx scripts/fetch-talent-photos.ts --all      → actualiza todos
 *   npx tsx scripts/fetch-talent-photos.ts --dry      → dry-run
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ── Cargar .env.local ─────────────────────────────────────────────────
function loadEnv(): void {
  try {
    const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) val = val.slice(1, -1);
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
}
loadEnv();

// ── Imports ───────────────────────────────────────────────────────────
// Static imports for modules that DO NOT touch lib/env.ts
import { neon } from '@neondatabase/serverless';

type TalentRow   = { id: number; name: string; photoUrl: string | null };
type SocialRow   = { talentId: number; platform: string; handle: string; platformId: string | null };

// ── Main ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fetchAll = args.includes('--all');
  const dryRun   = args.includes('--dry');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('❌ DATABASE_URL no definida'); process.exit(1); }

  // Dynamic imports AFTER loadEnv() ran, so lib/env.ts can validate against
  // the populated process.env without crashing on this script.
  const { fetchTwitchUserPhotos, fetchTwitchUserPhotoByLogin } = await import('../src/lib/services/twitch');
  const { fetchYouTubeChannelPhotos } = await import('../src/lib/services/youtube');

  const sql = neon(dbUrl);
  console.log(`\n🎯 Fetch Talent Photos${dryRun ? ' [DRY-RUN]' : ''}${fetchAll ? ' [TODOS]' : ' [SIN FOTO]'}\n`);

  // Cargar datos
  const rawTalents = await sql`SELECT id, name, photo_url as "photoUrl" FROM talents ORDER BY name`;
  const rawSocials = await sql`
    SELECT talent_id as "talentId", platform, handle, platform_id as "platformId"
    FROM talent_socials
    WHERE platform IN ('twitch','youtube')
    ORDER BY talent_id, platform
  `;

  const allTalents = rawTalents as TalentRow[];
  const allSocials = rawSocials as SocialRow[];

  const targets = fetchAll ? allTalents : allTalents.filter((t) => !t.photoUrl);
  console.log(`📊 ${allTalents.length} talentos | ${targets.length} a procesar\n`);

  if (targets.length === 0) {
    console.log('✅ Todos los talentos ya tienen foto.');
    return;
  }

  // Agrupar socials por talent
  const socialsByTalent = new Map<number, SocialRow[]>();
  for (const s of allSocials) {
    const list = socialsByTalent.get(s.talentId) ?? [];
    list.push(s);
    socialsByTalent.set(s.talentId, list);
  }

  // Clasificar por fuente
  const twitchById:    { talentId: number; platformId: string }[] = [];
  const twitchByLogin: { talentId: number; handle: string }[] = [];
  const youtubeById:   { talentId: number; channelId: string }[] = [];

  // Twitch user IDs are numeric; YouTube channel IDs start with "UC" (24 chars).
  // Some rows in talent_socials.platform_id were populated with the handle by
  // mistake — treat anything that doesn't match the expected shape as a handle.
  const isTwitchId = (v: string): boolean => /^\d+$/.test(v);
  const isYouTubeChannelId = (v: string): boolean => /^UC[A-Za-z0-9_-]{22}$/.test(v);

  for (const talent of targets) {
    const socials = socialsByTalent.get(talent.id) ?? [];
    const tw = socials.find((s) => s.platform === 'twitch');
    if (tw) {
      if (tw.platformId && isTwitchId(tw.platformId)) {
        twitchById.push({ talentId: talent.id, platformId: tw.platformId });
      } else if (tw.handle) {
        twitchByLogin.push({ talentId: talent.id, handle: tw.handle });
      }
      continue;
    }
    const yt = socials.find((s) => s.platform === 'youtube');
    if (yt?.platformId && isYouTubeChannelId(yt.platformId)) {
      youtubeById.push({ talentId: talent.id, channelId: yt.platformId });
    }
  }

  console.log(`🟣 Twitch por ID:    ${twitchById.length}`);
  console.log(`🟣 Twitch por login: ${twitchByLogin.length}`);
  console.log(`🔴 YouTube por ID:   ${youtubeById.length}`);

  const photoMap = new Map<number, string>();

  // Twitch returns generic placeholder URLs (purple wordmark) for accounts
  // that haven't uploaded an avatar — those are useless, skip them.
  const isTwitchDefaultUrl = (url: string): boolean =>
    url.includes('/user-default-pictures-uv/') || url.includes('/jtv_user_pictures/xarth/');

  // 1. Twitch por ID
  if (twitchById.length > 0) {
    console.log('\n⏳ Twitch /helix/users por ID…');
    try {
      const photos = await fetchTwitchUserPhotos(twitchById.map((t) => t.platformId));
      const byId = new Map(photos.map((p) => [p.userId, p.profileImageUrl]));
      let found = 0;
      for (const { talentId, platformId } of twitchById) {
        const img = byId.get(platformId);
        if (img && !isTwitchDefaultUrl(img)) { photoMap.set(talentId, img); found++; }
      }
      console.log(`   ✓ ${found}/${twitchById.length} encontradas`);
    } catch (e) { console.error('   ❌', (e as Error).message); }
  }

  // 2. Twitch por login
  const loginPending = twitchByLogin.filter((t) => !photoMap.has(t.talentId));
  if (loginPending.length > 0) {
    console.log(`\n⏳ Twitch /helix/users por login (${loginPending.length})…`);
    try {
      const photos = await fetchTwitchUserPhotoByLogin(loginPending.map((t) => t.handle));
      const byLogin = new Map(photos.map((p) => [p.login.toLowerCase(), p.profileImageUrl]));
      let found = 0;
      for (const { talentId, handle } of loginPending) {
        const img = byLogin.get(handle.replace('@', '').toLowerCase());
        if (img && !isTwitchDefaultUrl(img)) { photoMap.set(talentId, img); found++; }
      }
      console.log(`   ✓ ${found}/${loginPending.length} encontradas`);
    } catch (e) { console.error('   ❌', (e as Error).message); }
  }

  // 3. YouTube
  const ytPending = youtubeById.filter((t) => !photoMap.has(t.talentId));
  if (ytPending.length > 0) {
    console.log(`\n⏳ YouTube /channels?part=snippet (${ytPending.length})…`);
    try {
      const photos = await fetchYouTubeChannelPhotos(ytPending.map((t) => t.channelId));
      const byChannel = new Map(photos.map((p) => [p.channelId, p.thumbnailUrl]));
      let found = 0;
      for (const { talentId, channelId } of ytPending) {
        const img = byChannel.get(channelId);
        if (img) { photoMap.set(talentId, img); found++; }
      }
      console.log(`   ✓ ${found}/${ytPending.length} encontradas`);
    } catch (e) { console.error('   ❌', (e as Error).message); }
  }

  console.log(`\n📸 Fotos obtenidas: ${photoMap.size}/${targets.length}\n`);

  // Guardar en BD
  let updated = 0, errors = 0;
  for (const [talentId, photoUrl] of photoMap.entries()) {
    const name = targets.find((t) => t.id === talentId)?.name ?? `ID ${talentId}`;
    if (dryRun) {
      console.log(`  [DRY] ${name} → ${photoUrl.slice(0, 70)}…`);
      continue;
    }
    try {
      await sql`UPDATE talents SET photo_url = ${photoUrl} WHERE id = ${talentId}`;
      console.log(`  ✓ ${name}`);
      updated++;
    } catch (e) {
      console.error(`  ❌ ${name}: ${(e as Error).message}`);
      errors++;
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Actualizados: ${updated} | Errores: ${errors} | Sin API: ${targets.length - photoMap.size}`);
  }

  // Listar los que quedan sin foto
  const missing = targets.filter((t) => !photoMap.has(t.id));
  if (missing.length > 0) {
    console.log('\n⚠️  Sin foto (no tienen Twitch/YouTube con platformId):');
    for (const t of missing) {
      const socials = socialsByTalent.get(t.id) ?? [];
      const info = socials.map((s) => `${s.platform}:${s.handle}`).join(', ') || 'sin socials';
      console.log(`   • ${t.name} | ${info}`);
    }
  }
}

main().catch((e) => {
  console.error('Error fatal:', (e as Error).message);
  process.exit(1);
});
