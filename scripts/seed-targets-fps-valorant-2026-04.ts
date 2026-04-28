import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { targets } from '../src/db/schema/targets';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const conn = neon(process.env.DATABASE_URL);
const db = drizzle(conn);

const BATCH_ID = 'firecrawl-fps-valorant-2026-04';

type TargetRow = typeof targets.$inferInsert;

// CS2/FPS Twitch streamers — nuevos (no en firecrawl-cs2-2026-04 ni contratados)
// Descartados como ya contratados: nikomfps, nikozfps, branuel
// Descartados como ya en batch cs2: elmorocho7, dareh77
const twitchCs2New: TargetRow[] = [
  {
    username: 'getflakked',
    fullName: 'getFlakked',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/getflakked',
    followers: 209000,
    bio: 'CS2/FPS streamer en español — España',
    discoveredVia: 'firecrawl/twitchtracker-cs2-es',
    importBatchId: BATCH_ID,
  },
  // Ligeramente por encima de 220K pero top targets España CS2 puro
  {
    username: 'forg1',
    fullName: 'forg1',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/forg1',
    followers: 252800,
    bio: 'CS2 puro — España. Aurora Gaming. "CS por donde mires"',
    discoveredVia: 'firecrawl/twitchtracker-cs2-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'skain',
    fullName: 'skain',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/skain',
    followers: 241000,
    bio: 'FPS/variety streamer en español — España. Twitch Ambassador',
    discoveredVia: 'firecrawl/twitchtracker-cs2-es',
    importBatchId: BATCH_ID,
  },
];

// CS2/FPS YouTube creators en español
const youtubeCs2New: TargetRow[] = [
  {
    username: 'hdsuso',
    fullName: 'HDSuSo',
    platform: 'youtube',
    profileUrl: 'https://www.youtube.com/@hdsuso',
    followers: 60000,
    bio: 'CS2 YouTube en español — España',
    discoveredVia: 'firecrawl/socialblade-youtube-cs2-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'mixwellcs',
    fullName: 'mixwellcs',
    platform: 'youtube',
    profileUrl: 'https://www.youtube.com/@mixwellcs',
    followers: 55000,
    bio: 'CS2 YouTube en español — España. Muy activo',
    discoveredVia: 'firecrawl/socialblade-youtube-cs2-es',
    importBatchId: BATCH_ID,
  },
];

// Valorant Twitch streamers en español/LatAm
const twitchValorantNew: TargetRow[] = [
  {
    username: 'sergiofferra',
    fullName: 'sergiofferra',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/sergiofferra',
    followers: 205000,
    bio: 'Valorant streamer en español — España. Team Heretics',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'mazino',
    fullName: 'mazino',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/mazino',
    followers: 149766,
    bio: 'Valorant streamer en español — LatAm. MIBR Prodigy. 360 avg viewers',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'adcsuga',
    fullName: 'adcsuga',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/adcsuga',
    followers: 124000,
    bio: 'Valorant streamer en español — Argentina. Cross-platform YT/IG/TT',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'moon_days',
    fullName: 'moon_days',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/moon_days',
    followers: 107000,
    bio: 'Valorant/variety streamer en español — LatAm. 115 avg viewers',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'itsshayton',
    fullName: 'itsshayton',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/itsshayton',
    followers: 88000,
    bio: 'Valorant streamer en español — España. Cross-platform YT/IG/TT. 130 avg viewers',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'shyyf',
    fullName: 'shyyf',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/shyyf',
    followers: 76802,
    bio: 'Valorant streamer en español — España/LatAm. 192 avg viewers',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'santipatico_',
    fullName: 'santipatico_',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/santipatico_',
    followers: 74771,
    bio: 'Valorant streamer en español — España/LatAm. Muy activo (232 streams/año)',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'kadnita',
    fullName: 'kadnita',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/kadnita',
    followers: 72928,
    bio: 'Valorant streamer en español — España/LatAm. 150 streams/año',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'fzst',
    fullName: 'fzst',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/fzst',
    followers: 63865,
    bio: 'Valorant streamer en español — España/LatAm. En crecimiento (+727 followers/mes)',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'ic0nic',
    fullName: 'ic0nic',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/ic0nic',
    followers: 56289,
    bio: 'Valorant streamer en español — España/LatAm. Muy consistente (283 streams/año). 168 avg viewers',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'alpax',
    fullName: 'alpax',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/alpax',
    followers: 54753,
    bio: 'Valorant streamer en español — España/LatAm. El que más horas de Valorant tiene (1.225h). 165 avg viewers',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
  {
    username: 'andaluchino',
    fullName: 'andaluchino',
    platform: 'twitch',
    profileUrl: 'https://www.twitch.tv/andaluchino',
    followers: 55433,
    bio: 'Valorant streamer en español — España (Andalucía). Muy activo (215 streams/año)',
    discoveredVia: 'firecrawl/sullygnome-valorant-es',
    importBatchId: BATCH_ID,
  },
];

const allTargets: TargetRow[] = [
  ...twitchCs2New,
  ...youtubeCs2New,
  ...twitchValorantNew,
];

async function main(): Promise<void> {
  console.log(`Inserting ${allTargets.length} FPS/Valorant targets (batch: ${BATCH_ID})...`);

  const result = await db
    .insert(targets)
    .values(allTargets)
    .onConflictDoNothing()
    .returning({ id: targets.id, platform: targets.platform, username: targets.username });

  console.log(`Inserted ${result.length} new targets (skipped ${allTargets.length - result.length} duplicates).`);

  const byPlatform = result.reduce<Record<string, number>>((acc, r) => {
    acc[r.platform] = (acc[r.platform] ?? 0) + 1;
    return acc;
  }, {});
  for (const [platform, count] of Object.entries(byPlatform)) {
    console.log(`  ${platform}: ${count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
