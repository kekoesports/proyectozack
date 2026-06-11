// Query detallada de talentos sin bio aprobada. Uso: npx tsx scripts/query-talent-bio-data.mts
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const idx = line.indexOf('=');
    if (idx < 0 || line.trimStart().startsWith('#')) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && val && !(process.env[key])) process.env[key] = val;
  }
} catch { /* ignore */ }

const raw = process.env.DATABASE_URL ?? '';
if (!raw) { console.error('DATABASE_URL not set'); process.exit(1); }
const u = new URL(raw); u.searchParams.delete('channel_binding');
const sql = neon(u.toString());

type TalentRow = {
  id: number; name: string; slug: string; role: string | null; game: string | null;
  bio: string; bio_long: string | null;
  seo_bio_status: string | null; seo_bio_generated: string | null; seo_bio_manual: string | null;
};
type SocialRow = { talent_id: number; platform: string; handle: string | null; followers_display: string | null };
const [talents, socials] = await Promise.all([
  sql`
    SELECT id, name, slug, role, game, bio, bio_long, seo_bio_status, seo_bio_generated, seo_bio_manual
    FROM talents
    WHERE visibility = 'public' AND seo_bio_status IS DISTINCT FROM 'approved'
    ORDER BY name
  ` as Promise<TalentRow[]>,
  sql`
    SELECT talent_id, platform, handle, followers_display
    FROM talent_socials
    ORDER BY talent_id, sort_order
  ` as Promise<SocialRow[]>,
]);

const socialsByTalent = new Map<number, SocialRow[]>();
for (const s of socials) {
  if (!socialsByTalent.has(s.talent_id)) socialsByTalent.set(s.talent_id, []);
  socialsByTalent.get(s.talent_id)!.push(s);
}
console.log(`Talentos públicos sin bio approved: ${talents.length}\n`);
for (const t of talents) {
  console.log(`── ${t.name} (${t.slug}) ──`);
  console.log(`   status: ${t.seo_bio_status ?? 'empty'} | role: ${t.role ?? '?'} | game: ${t.game ?? '?'}`);
  const ss = socialsByTalent.get(t.id) ?? [];
  for (const s of ss) {
    console.log(`   ${s.platform}: @${s.handle ?? '?'} — ${s.followers_display ?? '?'}`);
  }
  if (t.bio) console.log(`   bio (short): ${t.bio.slice(0, 100)}`);
  if (t.bio_long) console.log(`   bio_long: ${t.bio_long.slice(0, 100)}…`);
  if (t.seo_bio_manual) console.log(`   seo_bio_manual: ${t.seo_bio_manual.slice(0, 100)}…`);
  else if (t.seo_bio_generated) console.log(`   seo_bio_generated: ${t.seo_bio_generated.slice(0, 100)}…`);
  console.log('');
}
