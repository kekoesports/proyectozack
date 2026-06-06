/**
 * seed.ts — populate all tables from source HTML data
 * Run: npx tsx scripts/seed.ts
 *
 * Insert order respects FK constraints:
 * 1. brands
 * 2. talents → talent_tags, talent_stats, talent_socials
 * 3. collaborators
 * 4. team_members
 * 5. case_studies → case_body, case_tags, case_creators
 * 7. portfolio_items
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema/index';

// Load .env.local manually (tsx doesn't auto-load it)
import { readFileSync } from 'fs';
import { join } from 'path';
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val && !process.env[key]) {
      process.env[key] = val;
    }
  }
} catch {
  // .env.local may not exist in CI
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Fill in .env.local first.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// ─── DATA ────────────────────────────────────────────────────────────────────

// Fuente de verdad: archivos en `/public/images/brands/`. Slug = filename
// sin extensión. Si añades/eliminas un asset, actualiza esta lista o usa
// `npx tsx scripts/seeds/sync-brands-to-assets.ts` para reflejar el folder.
const BRANDS_DATA = [
  { slug: 'hellcase', displayName: 'HELLCASE', logoUrl: '/images/brands/hellcase.png', sortOrder: 0 },
  { slug: 'keydrop', displayName: 'KEYDROP', logoUrl: '/images/brands/keydrop.png', sortOrder: 1 },
  { slug: 'evoplay', displayName: 'EVOPLAY', logoUrl: '/images/brands/evoplay.png', sortOrder: 2 },
  { slug: 'skinclub', displayName: 'SKIN.CLUB', logoUrl: '/images/brands/skinclub.png', sortOrder: 3 },
  { slug: 'empiredrop', displayName: 'EMPIREDROP', logoUrl: '/images/brands/empiredrop.png', sortOrder: 4 },
  { slug: 'pinup', displayName: 'PIN-UP', logoUrl: '/images/brands/pinup.png', sortOrder: 5 },
  { slug: 'emma', displayName: 'EMMA', logoUrl: '/images/brands/emma.png', sortOrder: 6 },
  { slug: '1win', displayName: '1WIN', logoUrl: '/images/brands/1win.png', sortOrder: 7 },
  { slug: 'skinsmonkey', displayName: 'SKINSMONKEY', logoUrl: '/images/brands/skinsmonkey.png', sortOrder: 8 },
  { slug: 'clashgg', displayName: 'CLASH.GG', logoUrl: '/images/brands/clashgg.png', sortOrder: 9 },
  { slug: 'ggdrop', displayName: 'GGDROP', logoUrl: '/images/brands/ggdrop.png', sortOrder: 10 },
  { slug: 'kick', displayName: 'KICK', logoUrl: '/images/brands/kick.png', sortOrder: 11 },
  { slug: 'razer', displayName: 'RAZER', logoUrl: '/images/brands/razer.png', sortOrder: 12 },
  { slug: 'pccomponentes', displayName: 'PCCOMPONENTES', logoUrl: '/images/brands/pccomponentes.png', sortOrder: 13 },
  { slug: 'jugabet', displayName: 'JUGABET', logoUrl: '/images/brands/jugabet.svg', sortOrder: 14 },
  { slug: '1xbet', displayName: '1XBET', logoUrl: '/images/brands/1xbet.png', sortOrder: 15 },
  { slug: 'skinplace', displayName: 'SKIN.PLACE', logoUrl: '/images/brands/skinplace.png', sortOrder: 16 },
  { slug: 'csgoskins', displayName: 'CSGOSKINS',  logoUrl: '/images/brands/csgoskins.png',  sortOrder: 17 },
  { slug: 'yosports',  displayName: 'YOSPORTS',   logoUrl: '/images/brands/yosports.png',   sortOrder: 18 },
  { slug: 'csdrop',    displayName: 'CSDROP',      logoUrl: '/images/brands/csdrop.png',      sortOrder: 19 },
];

type TalentPlatform = 'twitch' | 'youtube';
type TalentStatus = 'active' | 'available';

interface TalentData {
  slug: string;
  name: string;
  role: string;
  game: string;
  platform: TalentPlatform;
  status: TalentStatus;
  bio: string;
  gradientC1: string;
  gradientC2: string;
  initials: string;
  photoUrl: string;
  tags: string[];
  stats: Array<{ icon: string; value: string; label: string }>;
  socials: Array<{ platform: string; handle: string; followersDisplay: string; profileUrl: string | null; hexColor: string }>;
}

const TALENTS_DATA: TalentData[] = [
  {
    slug: 'todocs2', name: 'TODOCS2', role: 'CS2 Pro Streamer', game: 'CS2',
    platform: 'twitch', status: 'active',
    bio: 'Uno de los streamers de CS2 más reconocidos de la escena hispana. Conocido por su nivel competitivo, sus directos de alto voltaje y una comunidad fiel que sigue cada partida.',
    gradientC1: '#f5632a', gradientC2: '#e03070', initials: 'TC',
    photoUrl: '/images/talents/todocs2.jpg',
    tags: ['CS2', 'FPS Competitivo', 'Twitch', 'España'],
    stats: [
      { icon: '📺', value: '180K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '2.1M', label: 'Views/mes' },
      { icon: '❤️', value: '8.4%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'todocs2', followersDisplay: '180K', profileUrl: 'https://twitch.tv/todocs2', hexColor: '#9146FF' },
      { platform: 'x', handle: '@todocs2', followersDisplay: '45K', profileUrl: 'https://twitter.com/todocs2', hexColor: '#000000' },
      { platform: 'yt', handle: 'TODOCS2', followersDisplay: '95K', profileUrl: 'https://youtube.com/@todocs2', hexColor: '#FF0000' },
      { platform: 'ig', handle: '@todocs2', followersDisplay: '28K', profileUrl: 'https://instagram.com/todocs2', hexColor: '#E1306C' },
    ],
  },
  {
    slug: 'deqiuv', name: 'DEQIUV', role: 'CS2 & Valorant Streamer', game: 'CS2 · Valorant',
    platform: 'twitch', status: 'active',
    bio: 'Streamer multijuego especializado en FPS competitivo. Combina alto nivel en CS2 y Valorant con entretenimiento que mantiene a su audiencia enganchada hora tras hora.',
    gradientC1: '#e03070', gradientC2: '#8b3aad', initials: 'DQ',
    photoUrl: '/images/talents/deqiuv.jpg',
    tags: ['CS2', 'Valorant', 'FPS', 'Twitch'],
    stats: [
      { icon: '📺', value: '95K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '850K', label: 'Views/mes' },
      { icon: '❤️', value: '7.2%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'deqiuv', followersDisplay: '95K', profileUrl: 'https://twitch.tv/deqiuv', hexColor: '#9146FF' },
      { platform: 'x', handle: '@deqiuv', followersDisplay: '22K', profileUrl: 'https://twitter.com/deqiuv', hexColor: '#000000' },
      { platform: 'yt', handle: 'DEQIUV', followersDisplay: '40K', profileUrl: 'https://www.youtube.com/DEQIUV', hexColor: '#FF0000' },
      { platform: 'tt', handle: '@deqiuv', followersDisplay: '18K', profileUrl: 'https://tiktok.com/@deqiuv', hexColor: '#010101' },
    ],
  },
  {
    slug: 'adams', name: 'ADAMS', role: 'YouTuber & Gaming Creator', game: 'FPS · Gaming',
    platform: 'youtube', status: 'active',
    bio: 'Creador de contenido gaming orientado a YouTube con narrativa única y edición de alta calidad. Produce reviews, gameplays y entretenimiento que conecta con la audiencia hispana.',
    gradientC1: '#8b3aad', gradientC2: '#5b9bd5', initials: 'AD',
    photoUrl: '/images/talents/adams.jpg',
    tags: ['YouTube', 'Gaming', 'FPS', 'Contenido'],
    stats: [
      { icon: '▶️', value: '220K', label: 'Suscriptores YouTube' },
      { icon: '👀', value: '1.4M', label: 'Views/mes' },
      { icon: '❤️', value: '6.8%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'yt', handle: 'ADAMS', followersDisplay: '220K', profileUrl: 'https://youtube.com/@AdamsCS2', hexColor: '#FF0000' },
      { platform: 'ig', handle: '@adams_gaming', followersDisplay: '55K', profileUrl: 'https://instagram.com/adams_gaming', hexColor: '#E1306C' },
      { platform: 'x', handle: '@adams_gaming', followersDisplay: '30K', profileUrl: 'https://twitter.com/adams_gaming', hexColor: '#000000' },
      { platform: 'tt', handle: '@adams', followersDisplay: '42K', profileUrl: 'https://tiktok.com/@adams', hexColor: '#010101' },
    ],
  },
  {
    slug: 'mecha', name: 'MECHA ALVAREZ', role: 'CS2 Esports Streamer', game: 'CS2 · Esports',
    platform: 'twitch', status: 'active',
    bio: 'Figura consolidada de la escena CS2 española. Con historial competitivo a sus espaldas, combina análisis táctico con directos llenos de intensidad.',
    gradientC1: '#5b9bd5', gradientC2: '#e03070', initials: 'MA',
    photoUrl: '/images/talents/mecha.jpg',
    tags: ['CS2', 'Esports', 'Competitivo', 'Twitch'],
    stats: [
      { icon: '📺', value: '75K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '620K', label: 'Views/mes' },
      { icon: '❤️', value: '9.1%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'mechaalvarez', followersDisplay: '75K', profileUrl: 'https://twitch.tv/mechaalvarez', hexColor: '#9146FF' },
      { platform: 'x', handle: '@mechaalvarez', followersDisplay: '18K', profileUrl: 'https://twitter.com/mechaalvarez', hexColor: '#000000' },
      { platform: 'yt', handle: 'Mecha Alvarez', followersDisplay: '25K', profileUrl: 'https://youtube.com/@mechaalvarez', hexColor: '#FF0000' },
      { platform: 'ig', handle: '@mechaalvarez', followersDisplay: '12K', profileUrl: 'https://instagram.com/mechaalvarez', hexColor: '#E1306C' },
    ],
  },
  {
    slug: 'huasopeek', name: 'HUASOPEEK', role: 'Valorant & CS2 Streamer', game: 'Valorant · CS2',
    platform: 'twitch', status: 'active',
    bio: 'Streamer latinoamericano referente en Valorant y CS2. Su carisma y habilidad le han ganado una comunidad muy leal activa en los mercados LatAm y español.',
    gradientC1: '#f5632a', gradientC2: '#c42880', initials: 'HP',
    photoUrl: '/images/talents/huasopeek.jpg',
    tags: ['Valorant', 'CS2', 'LatAm', 'Twitch'],
    stats: [
      { icon: '📺', value: '120K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '980K', label: 'Views/mes' },
      { icon: '❤️', value: '7.8%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'huasopeek', followersDisplay: '120K', profileUrl: 'https://twitch.tv/huasopeek', hexColor: '#9146FF' },
      { platform: 'x', handle: '@huasopeek', followersDisplay: '35K', profileUrl: 'https://twitter.com/huasopeek', hexColor: '#000000' },
      { platform: 'yt', handle: 'HuasoPeek', followersDisplay: '60K', profileUrl: 'https://youtube.com/@huasopeek', hexColor: '#FF0000' },
      { platform: 'tt', handle: '@huasopeek', followersDisplay: '25K', profileUrl: 'https://tiktok.com/@huasopeek', hexColor: '#010101' },
    ],
  },
  {
    slug: 'rinna', name: 'RINNA', role: 'Content Creator', game: 'Content Creator',
    platform: 'youtube', status: 'active',
    bio: 'Creadora de contenido con enfoque fresco dentro del universo gaming. Conecta especialmente con audiencias jóvenes a través de un estilo cercano y auténtico.',
    gradientC1: '#e03070', gradientC2: '#c42880', initials: 'RI',
    photoUrl: '/images/talents/rinna.jpg',
    tags: ['Gaming', 'Lifestyle', 'YouTube', 'Twitch'],
    stats: [
      { icon: '▶️', value: '85K', label: 'Suscriptores YouTube' },
      { icon: '📺', value: '40K', label: 'Seguidores Twitch' },
      { icon: '❤️', value: '11.2%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'yt', handle: 'RINNA', followersDisplay: '85K', profileUrl: 'https://youtube.com/@rinna', hexColor: '#FF0000' },
      { platform: 'twitch', handle: 'rinna', followersDisplay: '40K', profileUrl: 'https://twitch.tv/rinna', hexColor: '#9146FF' },
      { platform: 'ig', handle: '@rinna', followersDisplay: '48K', profileUrl: 'https://instagram.com/rinna', hexColor: '#E1306C' },
      { platform: 'tt', handle: '@rinna', followersDisplay: '92K', profileUrl: 'https://tiktok.com/@rinna', hexColor: '#010101' },
    ],
  },
  {
    slug: 'martinez', name: 'MARTINEZ', role: 'Esports & Variety Streamer', game: 'Esports · Variety',
    platform: 'twitch', status: 'active',
    bio: 'Streamer versátil con raíces en el esports competitivo. Alterna contenido de alto nivel con variety gaming para atraer público amplio dentro de la escena hispana.',
    gradientC1: '#e03070', gradientC2: '#f5632a', initials: 'MZ',
    photoUrl: '/images/talents/martinez.jpg',
    tags: ['Esports', 'Variety', 'Twitch', 'Competitivo'],
    stats: [
      { icon: '📺', value: '65K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '510K', label: 'Views/mes' },
      { icon: '❤️', value: '8.9%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'martinezsaa', followersDisplay: '65K', profileUrl: 'https://twitch.tv/martinezsaa', hexColor: '#9146FF' },
      { platform: 'x', handle: '@martinezsaa', followersDisplay: '20K', profileUrl: 'https://twitter.com/martinezsaa', hexColor: '#000000' },
      { platform: 'yt', handle: 'Martinez', followersDisplay: '30K', profileUrl: 'https://youtube.com/@martinezsaa', hexColor: '#FF0000' },
      { platform: 'ig', handle: '@martinezsaa', followersDisplay: '15K', profileUrl: 'https://instagram.com/martinezsaa', hexColor: '#E1306C' },
    ],
  },
  {
    slug: 'vityshow', name: 'Vityshow', role: 'Gaming Streamer', game: 'Gaming',
    platform: 'twitch', status: 'available',
    bio: 'Streamer de gaming con personalidad energética y estilo de contenido entretenido. Disponible para colaboraciones. Contacta con SocialPro para más información.',
    gradientC1: '#f5632a', gradientC2: '#8b3aad', initials: 'VS',
    photoUrl: '/images/talents/vityshow.jpg',
    tags: ['Gaming', 'Twitch', 'Disponible'],
    stats: [
      { icon: '📺', value: '35K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '280K', label: 'Views/mes' },
      { icon: '❤️', value: '10.3%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'vityshow', followersDisplay: '35K', profileUrl: 'https://twitch.tv/vityshow', hexColor: '#9146FF' },
      { platform: 'x', handle: '@vityshow', followersDisplay: '8K', profileUrl: 'https://twitter.com/vityshow', hexColor: '#000000' },
      { platform: 'yt', handle: 'Vityshow', followersDisplay: '15K', profileUrl: 'https://youtube.com/@vityshow', hexColor: '#FF0000' },
      { platform: 'ig', handle: '@vityshow', followersDisplay: '9K', profileUrl: 'https://instagram.com/vityshow', hexColor: '#E1306C' },
    ],
  },
  {
    slug: 'sofffi', name: 'SOFFFI', role: 'CS2 Content Creator', game: 'CS2',
    platform: 'twitch', status: 'active',
    bio: 'Creadora de contenido CS2 con comunidad activa y fiel. Combina habilidad competitiva con entretenimiento desde la perspectiva femenina en la escena FPS hispana.',
    gradientC1: '#5b9bd5', gradientC2: '#c42880', initials: 'SF',
    photoUrl: '/images/talents/sofffi.jpg',
    tags: ['CS2', 'FPS', 'Twitch'],
    stats: [
      { icon: '📺', value: '40K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '320K', label: 'Views/mes' },
      { icon: '❤️', value: '9.5%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'sofffi', followersDisplay: '40K', profileUrl: 'https://twitch.tv/sofffi', hexColor: '#9146FF' },
      { platform: 'x', handle: '@sofffi', followersDisplay: '12K', profileUrl: 'https://twitter.com/sofffi', hexColor: '#000000' },
      { platform: 'ig', handle: '@sofffi', followersDisplay: '22K', profileUrl: 'https://instagram.com/sofffi', hexColor: '#E1306C' },
      { platform: 'tt', handle: '@sofffi', followersDisplay: '15K', profileUrl: 'https://tiktok.com/@sofffi', hexColor: '#010101' },
    ],
  },
  {
    slug: 'naow', name: 'NAOW', role: 'Gaming Content Creator', game: 'Gaming · Variety',
    platform: 'youtube', status: 'active',
    bio: 'Iván González, creador de contenido gaming con visión propia y estilo directo. Construye audiencia real con consistencia y personalidad que destaca en la escena hispana.',
    gradientC1: '#f5632a', gradientC2: '#5b9bd5', initials: 'NW',
    photoUrl: '/images/talents/naow.jpg',
    tags: ['Gaming', 'YouTube', 'Variety'],
    stats: [
      { icon: '▶️', value: '55K', label: 'Suscriptores YouTube' },
      { icon: '📺', value: '30K', label: 'Seguidores Twitch' },
      { icon: '❤️', value: '8.7%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'yt', handle: 'Naow', followersDisplay: '55K', profileUrl: 'https://youtube.com/@naow', hexColor: '#FF0000' },
      { platform: 'twitch', handle: 'naow', followersDisplay: '30K', profileUrl: 'https://twitch.tv/naow', hexColor: '#9146FF' },
      { platform: 'ig', handle: '@naow', followersDisplay: '18K', profileUrl: 'https://instagram.com/naow', hexColor: '#E1306C' },
      { platform: 'tt', handle: '@naow', followersDisplay: '20K', profileUrl: 'https://tiktok.com/@naow', hexColor: '#010101' },
    ],
  },
  {
    slug: 'yamisanchezz', name: 'YAMISANCHEZZ', role: 'CS2 Content Creator', game: 'CS2',
    platform: 'twitch', status: 'active',
    bio: 'Yami Sánchez, creadora de contenido CS2 con presencia real en la escena competitiva hispana. Estilo energético y nivel que la posicionan como referente femenina en FPS.',
    gradientC1: '#e03070', gradientC2: '#8b3aad', initials: 'YS',
    photoUrl: '/images/talents/yamisanchezz.jpg',
    tags: ['CS2', 'FPS', 'Twitch'],
    stats: [
      { icon: '📺', value: '50K', label: 'Seguidores Twitch' },
      { icon: '👀', value: '410K', label: 'Views/mes' },
      { icon: '❤️', value: '10.1%', label: 'Engagement Rate' },
    ],
    socials: [
      { platform: 'twitch', handle: 'yamisanchezz', followersDisplay: '50K', profileUrl: 'https://twitch.tv/yamisanchezz', hexColor: '#9146FF' },
      { platform: 'x', handle: '@yamisanchezz', followersDisplay: '25K', profileUrl: 'https://twitter.com/yamisanchezz', hexColor: '#000000' },
      { platform: 'ig', handle: '@yamisanchezz', followersDisplay: '35K', profileUrl: 'https://instagram.com/yamisanchezz', hexColor: '#E1306C' },
      { platform: 'tt', handle: '@yamisanchezz', followersDisplay: '28K', profileUrl: 'https://tiktok.com/@yamisanchezz', hexColor: '#010101' },
    ],
  },
  {
    slug: 'eruby', name: 'ERUBY', role: 'CS2 Content Creator', game: 'CS2',
    platform: 'youtube', status: 'active',
    bio: 'Creador de contenido especializado en CS2. Highlights, tutoriales y colaboraciones con marcas de skins y plataformas gaming.',
    gradientC1: '#e03070', gradientC2: '#f5632a', initials: 'ER',
    photoUrl: '/images/talents/eruby.jpg',
    tags: ['CS2', 'YouTube', 'Skins', 'Gaming'],
    stats: [
      { icon: '▶', value: '45K', label: 'YouTube' },
      { icon: '🟣', value: '18K', label: 'Twitch' },
      { icon: '✖', value: '22K', label: 'Twitter' },
      { icon: '📸', value: '28K', label: 'Instagram' },
    ],
    socials: [
      { platform: 'youtube', handle: 'eruby', followersDisplay: '45K', profileUrl: 'https://youtube.com/@eruby', hexColor: '#FF0000' },
      { platform: 'twitch', handle: 'eruby', followersDisplay: '18K', profileUrl: 'https://twitch.tv/eruby', hexColor: '#9146FF' },
      { platform: 'twitter', handle: 'eruby', followersDisplay: '22K', profileUrl: 'https://twitter.com/eruby', hexColor: '#1DA1F2' },
      { platform: 'instagram', handle: 'eruby', followersDisplay: '28K', profileUrl: 'https://instagram.com/eruby', hexColor: '#E1306C' },
    ],
  },
];

const COLLABORATORS_DATA = [
  {
    slug: 'andrechini', name: 'Andrechini', description: 'Streamer & Content Creator',
    badge: 'Twitch · YouTube', photoUrl: '/images/collabs/andrechini.jpg',
    profileUrl: 'https://twitch.tv/andrechini',
    gradientC1: '#e03070', gradientC2: '#c42880', initials: 'AN', sortOrder: 0,
  },
  {
    slug: 'imantado', name: 'Imantado', description: 'Gaming & Variety Streamer',
    badge: 'Twitch · CS2', photoUrl: '/images/collabs/imantado.jpg',
    profileUrl: 'https://twitch.tv/imantado',
    gradientC1: '#f5632a', gradientC2: '#8b3aad', initials: 'IM', sortOrder: 1,
  },
  {
    slug: 'imicaelax', name: 'Imicaelax', description: 'Content Creator',
    badge: 'YouTube · Twitch', photoUrl: '/images/collabs/imicaelax.jpg',
    profileUrl: 'https://twitch.tv/imicaelax',
    gradientC1: '#8b3aad', gradientC2: '#5b9bd5', initials: 'IC', sortOrder: 2,
  },
  {
    slug: 'manolito', name: 'Manolito', description: 'La Casa de los Gemelos',
    badge: 'Twitch · YouTube · TikTok', photoUrl: '/images/talents/manolito.jpg',
    profileUrl: 'https://twitch.tv/manolito',
    gradientC1: '#f5632a', gradientC2: '#c42880', initials: 'MA', sortOrder: 3,
  },
  {
    slug: 'therealfer', name: 'The Real Fer', description: 'Streamer & Content Creator',
    badge: 'Twitch · X · YouTube', photoUrl: '/images/talents/Therealfer.jpg',
    profileUrl: 'https://twitch.tv/therealfer',
    gradientC1: '#5b9bd5', gradientC2: '#8b3aad', initials: 'RF', sortOrder: 4,
  },
];

const TEAM_DATA = [
  {
    slug: 'alfonso', name: 'Alfonso Arias', role: 'Co-Founder & Talent Strategy',
    bio: 'Conocido como "Zack" en la comunidad. Ex-pro player CS, streamer. +7 años en gambling. Especializado en talentos y YouTube management.',
    photoUrl: null, gradientC1: '#f5632a', gradientC2: '#e03070', initials: 'AF', sortOrder: 0,
  },
  {
    slug: 'keko', name: 'Pablo Camacho', role: 'Founder & CEO',
    bio: 'Conocido como "Kekō" en la comunidad. +14 años en esports/gaming. Ex pro player CS:GO. Especialista en iGaming y desarrollo de negocio.',
    photoUrl: null, gradientC1: '#8b3aad', gradientC2: '#5b9bd5', initials: 'KK', sortOrder: 1,
  },
  {
    slug: 'giuliano', name: 'Giuliano', role: 'LATAM Partnerships Manager',
    bio: 'Experto en casino y casas de apuestas. Centrado en acuerdos iGaming para el mercado LATAM. +5 años de experiencia.',
    photoUrl: null, gradientC1: '#e03070', gradientC2: '#c42880', initials: 'GI', sortOrder: 2,
  },
  {
    slug: 'cm', name: 'Community Manager', role: 'Community & Growth Manager',
    bio: 'Gestión de comunidades, contenido social y crecimiento orgánico.',
    photoUrl: null, gradientC1: '#5b9bd5', gradientC2: '#8b3aad', initials: 'CM', sortOrder: 3,
  },
];

interface CaseData {
  slug: string;
  brandName: string;
  title: string;
  logoUrl: string | null;
  sortOrder: number;
  reach: string | null;
  engagementRate: string | null;
  conversions: string | null;
  roiMultiplier: string | null;
  heroImageUrl: string | null;
  excerpt: string | null;
  body: string[];
  tags: string[];
  creators: string[];
}

const CASES_DATA: CaseData[] = [
  {
    slug: 'razer', brandName: 'RAZER',
    title: 'SocialPro × RAZER: Activación con creadores del ecosistema gaming',
    logoUrl: '/images/cases/razer.jpg', sortOrder: 0,
    reach: '2.5M+', engagementRate: '4.8%', conversions: '185K interacciones',
    roiMultiplier: '3.2x', heroImageUrl: null,
    excerpt: 'Activación multicanal con 13 creadores del ecosistema gaming, integrando periféricos RAZER en streams y redes sociales.',
    body: [
      'SocialPro ha colaborado con RAZER, una de las marcas líderes a nivel mundial en periféricos gaming, en una activación con distintos creadores de contenido del ecosistema gaming y de streaming.',
      'La campaña contó con la participación de múltiples perfiles del sector, quienes integraron periféricos de la marca en sus setups y contenido habitual, reforzando la presencia de RAZER dentro de sus comunidades.',
      'Varios creadores recibieron sillas gaming, ratones, teclados y cascos, que fueron mostrados en directo durante sus streams y publicados en redes sociales. La activación se amplió con historias en Instagram y vídeos en TikTok.',
      'Este tipo de acciones permiten a las marcas conectar de forma natural con audiencias gaming activas, mostrando los productos en el entorno donde realmente se utilizan: el setup diario de los creadores.',
    ],
    tags: ['Gaming Hardware', 'Twitch', 'YouTube', 'Instagram', 'TikTok', 'Periféricos', 'Multicanal', '13 creadores'],
    creators: ['IreneRAWR', 'Deqiuv', 'Rinna', 'The Real Fer', 'Goked', 'Naow', 'Vityshow', 'Todocs2', 'Eruby', 'Joanpau', 'Dess', 'D3stri'],
  },
  {
    slug: 'onewin', brandName: '1WIN',
    title: '1WIN × SocialPro: 100+ Influencers en Instagram',
    logoUrl: null, sortOrder: 1,
    reach: '8M+', engagementRate: '3.5%', conversions: '100+ influencers activos',
    roiMultiplier: '4.5x', heroImageUrl: null,
    excerpt: 'Campaña activa con más de 100 influencers del ecosistema gaming e iGaming en Instagram, en constante expansión.',
    body: [
      'Campaña activa desde mediados de 2025. Activación en Instagram con más de 100 influencers del ecosistema gaming e iGaming.',
      'Con perfiles como Manolito de Zona Gemelos entre otros, la campaña sigue activa y en constante expansión.',
    ],
    tags: ['iGaming', 'Instagram', '100+ influencers', 'Activa 2025', 'España', 'LatAm'],
    creators: ['Manolito de Zona Gemelos', 'y muchos más del ecosistema gaming'],
  },
  {
    slug: 'skinsmonkey', brandName: 'SKINSMONKEY',
    title: 'SkinsMonkey × SocialPro: +200.000€ en CS2 Skins Marketplace',
    logoUrl: null, sortOrder: 2,
    reach: '1.2M+', engagementRate: '6.2%', conversions: '200K€+ en trading',
    roiMultiplier: '5.1x', heroImageUrl: null,
    excerpt: 'Gestión de 13 creadores CS2 en YouTube con más de 200.000€ trackeados en trading de skins.',
    body: [
      'Desde inicios de 2025, SocialPro ha gestionado la presencia de SkinsMonkey con 13 creadores especializados en CS2 en YouTube.',
      'Más de 200.000€ trackeados en trading de skins directamente a través de los códigos de SocialPro. Tasas de conversión muy superiores a la media del sector.',
    ],
    tags: ['CS2 Skins', 'YouTube', 'Trading', '13 creadores', '200K€+', 'Marketplace'],
    creators: ['13 creadores especializados en CS2'],
  },
];

const POSTS_DATA = [
  {
    slug: 'tendencias-gaming-espana-2025',
    title: 'Tendencias del Marketing Gaming en España 2025',
    excerpt: 'El ecosistema gaming español evoluciona rápido. Analizamos las tendencias clave que están definiendo cómo las marcas conectan con audiencias gaming en 2025.',
    bodyMd: `## El auge del marketing de influencers gaming

El mercado español de influencer marketing gaming ha crecido un 34% respecto al año anterior. Las marcas ya no se limitan a banners estáticos: buscan integraciones orgánicas con creadores que realmente juegan y usan sus productos.

## Twitch sigue dominando, pero YouTube crece

Twitch mantiene su posición como plataforma líder para streaming en vivo, pero YouTube gaming está ganando terreno con contenido editado de alta calidad. Los creadores que dominan ambas plataformas tienen el mayor valor para las marcas.

## iGaming: el vertical que más invierte

Las plataformas de iGaming siguen siendo el principal inversor en marketing de influencers gaming en España. Con regulaciones cada vez más claras, las marcas buscan agencias que entiendan el compliance y puedan ejecutar campañas efectivas dentro del marco legal.

## Métricas que importan en 2025

Las vanity metrics ya no convencen. Las marcas quieren ver FTDs, engagement rate real, y conversiones trackeables. Las agencias que pueden demostrar ROI con datos concretos tienen ventaja competitiva enorme.

## Conclusión

El marketing gaming en España está madurando. Las marcas que inviertan en relaciones auténticas con creadores, cumplan con la regulación y midan resultados reales serán las que lideren el sector.`,
    author: 'SocialPro',
    status: 'published' as const,
    publishedAt: new Date('2025-02-15'),
    sortOrder: 0,
  },
  {
    slug: 'guia-creadores-conseguir-sponsor',
    title: 'Guía para Creadores: Cómo Conseguir tu Primer Sponsor',
    excerpt: 'Si eres streamer o creador de contenido gaming y quieres monetizar tu audiencia con sponsors, esta guía te explica paso a paso cómo hacerlo.',
    bodyMd: `## Antes de buscar sponsors: prepara tu media kit

Un media kit profesional es tu carta de presentación. Debe incluir: estadísticas actualizadas (seguidores, views, engagement rate), demografía de tu audiencia, ejemplos de campañas anteriores, y tus tarifas orientativas.

## Qué buscan las marcas en un creador

Las marcas no solo miran seguidores. Buscan engagement rate alto, audiencia relevante para su producto, consistencia en la creación de contenido, y profesionalismo en la comunicación.

## Dónde encontrar oportunidades

Las agencias de talento como SocialPro conectan creadores con marcas de forma profesional. También puedes contactar directamente a marcas gaming que ya trabajan con creadores similares a ti.

## Negocia con datos, no con sensaciones

Cuando una marca te contacta, presenta datos concretos: tu CPM, engagement rate, casos de éxito anteriores. Los creadores que hablan el lenguaje de las marcas cierran mejores acuerdos.

## Errores comunes que debes evitar

No aceptes acuerdos sin contrato escrito. No promociones productos que no usarías. No infles tus estadísticas. La reputación en este sector se construye con transparencia y resultados reales.`,
    author: 'SocialPro',
    status: 'published' as const,
    publishedAt: new Date('2025-03-01'),
    sortOrder: 1,
  },
  {
    slug: 'caso-exito-campana-gaming-hardware',
    title: 'Anatomía de una Campaña Exitosa: Gaming Hardware × Creadores',
    excerpt: 'Desglosamos cómo una campaña de periféricos gaming con 13 creadores generó 2.5M de alcance y un ROI de 3.2x en engagement.',
    bodyMd: `## El briefing: periféricos gaming para audiencia española

La marca buscaba aumentar awareness entre gamers españoles de 18-34 años. El presupuesto incluía producto (sillas, ratones, teclados, cascos) más compensación por contenido.

## Selección de creadores: calidad sobre cantidad

En lugar de activar 50 micro-influencers, seleccionamos 13 creadores con engagement rate superior al 5% y audiencia verificada en el nicho gaming español. Cada uno recibió un kit completo de productos.

## Ejecución multicanal

Los creadores integraron los productos de forma natural: unboxings en YouTube, uso en directo en Twitch, stories en Instagram y clips en TikTok. No se forzó ningún guion: cada creador adaptó el contenido a su estilo.

## Resultados medibles

La campaña generó más de 2.5M de impresiones, con un engagement rate promedio del 4.8%. 185K interacciones directas y un ROI de 3.2x sobre la inversión. Los productos aparecieron de forma recurrente en los streams semanas después de la campaña oficial.

## Lecciones aprendidas

La autenticidad gana. Los creadores que realmente usaban los productos generaron 3x más engagement que los que simplemente cumplían con el briefing mínimo. La selección de talento es el 80% del éxito de una campaña.`,
    author: 'SocialPro',
    status: 'published' as const,
    publishedAt: new Date('2025-03-10'),
    sortOrder: 2,
  },
  {
    slug: 'tendencias-gaming-latam-2026',
    title: 'Tendencias Gaming LATAM 2026: Qué Está Pasando y Por Qué Importa',
    excerpt: 'Latinoamérica tiene más de 300 millones de gamers, un CAGR del 9.12% y el mismo idioma que España. Analizamos qué está pasando en el ecosistema gaming hispanohablante y por qué las marcas que ignoran LATAM están dejando dinero sobre la mesa.',
    bodyMd: `## El mercado que nadie puede ignorar

Latinoamérica es el mercado gaming de más rápido crecimiento del mundo hispanohablante. Brasil lidera en volumen, pero México, Argentina y Colombia están generando ecosistemas de creadores de primer nivel que ya compiten globalmente. Con una base de más de 300 millones de gamers y una tasa de crecimiento anual del 9.12%, LATAM no es el futuro del gaming en español: es el presente.

## Las plataformas que dominan en 2026

Twitch y YouTube siguen siendo los grandes, pero con matices importantes respecto a España. En LATAM, Kick está creciendo a ritmo acelerado, especialmente en Argentina y México, donde la monetización en dólares es especialmente atractiva para los creadores. TikTok gaming también tiene un peso mayor que en Europa: clips de partidas, highlights y contenido vertical generan audiencias masivas en la región.

## Los géneros que mueven audiencia

Los títulos competitivos como CS2, Valorant y League of Legends siguen siendo los más seguidos. Pero hay un diferenciador clave en LATAM: los juegos de rol y aventura abierta tienen una penetración mucho mayor. FIFA (ahora EA Sports FC) y los battle royales como Free Fire —especialmente popular en segmentos de menor poder adquisitivo— completan el panorama. Free Fire, específicamente, es fenómeno masivo en México, Colombia y Brasil, con millones de jugadores que las agencias europeas aún no han sabido aprovechar.

## Los creadores que están definiendo la escena

Argentina está produciendo algunos de los talentos más interesantes del momento. El perfil argentino combina alto nivel técnico con personalidad y capacidad de entretenimiento que engancha. México aporta volumen: más creadores, más variedad de géneros y audiencias enormes. Colombia emerge con fuerza en Valorant y los títulos competitivos. En SocialPro ya representamos talento de Argentina, México y Colombia en nuestro roster, exactamente por esta razón.

## Por qué las marcas europeas siguen perdiendo esta oportunidad

La barrera no es el idioma —es el mismo. Tampoco es la plataforma —son las mismas. El problema es que la mayoría de agencias europeas no tienen talento LATAM representado ni relaciones con los creadores de la región. Las marcas que quieren activar en LATAM necesitan una agencia que entienda ambos mercados, que tenga credibilidad en los dos contextos y que pueda ejecutar campañas que se sientan auténticas, no importadas.

## Qué esperar en 2026

Tres tendencias que definirán el gaming LATAM este año: primero, la profesionalización de los esports regionales, con más ligas locales y más dinero en premios. Segundo, el crecimiento del streaming en español como lingua franca —los creadores LATAM tienen cada vez más audiencia española y viceversa. Tercero, el auge de las marcas de iGaming adaptadas a la región, donde la regulación está evolucionando rápido y las oportunidades son enormes para quienes lleguen antes.

## La ventaja del primer jugador

No existe hoy ninguna agencia premium hispanohablante con presencia consolidada en España y LATAM simultáneamente. Esa ventana no va a estar abierta para siempre. Las marcas que activen ahora, con talento representado en ambos mercados y una agencia que entienda los dos contextos, tendrán una ventaja competitiva que será muy difícil de replicar en 18 meses.`,
    author: 'SocialPro',
    status: 'published' as const,
    publishedAt: new Date('2026-03-19'),
    sortOrder: 3,
  },
];

const PORTFOLIO_DATA = [
  { type: 'thumb' as const, creatorName: 'MARTINEZ', title: 'Martinez & S1mple in FACEIT', imageUrl: '/images/portfolio/0.jpg', views: '18.5K CTR', date: 'Feb 2026', url: 'https://www.youtube.com/watch?v=vynaNvKPjMk', sortOrder: 0 },
  { type: 'thumb' as const, creatorName: 'HUASOPEEK', title: 'Campeones ACE SA Masters', imageUrl: '/images/portfolio/1.jpg', views: '21.2K CTR', date: 'Mar 2026', url: 'https://www.youtube.com/watch?v=Tz7kApOOg88', sortOrder: 1 },
  { type: 'thumb' as const, creatorName: 'MARTINEZ', title: 'Con dav1deus y nikom en Dust2', imageUrl: '/images/portfolio/2.jpg', views: '14.8K CTR', date: 'Ene 2026', url: 'https://www.youtube.com/watch?v=iOd736G7Izw', sortOrder: 2 },
  { type: 'thumb' as const, creatorName: 'MARTINEZ', title: 'MARTINEZ vs. MAIL09', imageUrl: '/images/portfolio/3.jpg', views: '16.3K CTR', date: 'Feb 2026', url: 'https://www.youtube.com/watch?v=vynaNvKPjMk', sortOrder: 3 },
  { type: 'thumb' as const, creatorName: 'MARTINEZ', title: 'MARTINEZ vs. KYOUSUKE en FACEIT', imageUrl: '/images/portfolio/4.jpg', views: '19.7K CTR', date: 'Mar 2026', url: 'https://www.youtube.com/watch?v=vynaNvKPjMk', sortOrder: 4 },
  { type: 'campaign' as const, creatorName: 'MARTINEZ x SkinsMonkey', title: 'Sorteo AWP Printstream — Código MARTINEZ', imageUrl: '/images/portfolio/5.jpg', views: '1.4M alcance', date: 'Feb 2026', url: '', sortOrder: 5 },
];

// ─── SEED ────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log('Starting seed...\n');

  // 1. Brands
  console.log('Inserting brands...');
  await db.insert(schema.brands).values(BRANDS_DATA).onConflictDoNothing();
  console.log(`  ${BRANDS_DATA.length} brands`);

  // 2. Talents + child tables
  console.log('Inserting talents...');
  for (let i = 0; i < TALENTS_DATA.length; i++) {
    const t = TALENTS_DATA[i];
    const { tags, stats, socials, ...talentRow } = t;

    const [inserted] = await db
      .insert(schema.talents)
      .values({ ...talentRow, sortOrder: i })
      .onConflictDoNothing()
      .returning({ id: schema.talents.id });

    if (!inserted) {
      console.log(`  skipped (already exists): ${t.slug}`);
      continue;
    }
    const talentId = inserted.id;

    if (tags.length) {
      await db.insert(schema.talentTags).values(
        tags.map((tag) => ({ talentId, tag }))
      ).onConflictDoNothing();
    }

    if (stats.length) {
      await db.insert(schema.talentStats).values(
        stats.map((s, idx) => ({ talentId, icon: s.icon, value: s.value, label: s.label, sortOrder: idx }))
      ).onConflictDoNothing();
    }

    if (socials.length) {
      await db.insert(schema.talentSocials).values(
        socials.map((s, idx) => ({
          talentId,
          platform: s.platform,
          handle: s.handle,
          followersDisplay: s.followersDisplay,
          profileUrl: s.profileUrl,
          hexColor: s.hexColor,
          sortOrder: idx,
        }))
      ).onConflictDoNothing();
    }

    console.log(`  inserted: ${t.slug}`);
  }

  // 3. Collaborators
  console.log('Inserting collaborators...');
  await db.insert(schema.collaborators).values(COLLABORATORS_DATA).onConflictDoNothing();
  console.log(`  ${COLLABORATORS_DATA.length} collaborators`);

  // 4. Team members
  console.log('Inserting team members...');
  await db.insert(schema.teamMembers).values(
    TEAM_DATA.map((m) => ({ ...m, photoUrl: m.photoUrl ?? undefined }))
  ).onConflictDoNothing();
  console.log(`  ${TEAM_DATA.length} team members`);

  // 5. Case studies + child tables
  console.log('Inserting case studies...');
  for (const c of CASES_DATA) {
    const { body, tags, creators, ...caseRow } = c;

    const [inserted] = await db
      .insert(schema.caseStudies)
      .values({
        ...caseRow,
        logoUrl: caseRow.logoUrl ?? undefined,
        heroImageUrl: caseRow.heroImageUrl ?? undefined,
        excerpt: caseRow.excerpt ?? undefined,
        reach: caseRow.reach ?? undefined,
        engagementRate: caseRow.engagementRate ?? undefined,
        conversions: caseRow.conversions ?? undefined,
        roiMultiplier: caseRow.roiMultiplier ?? undefined,
      })
      .onConflictDoNothing()
      .returning({ id: schema.caseStudies.id });

    if (!inserted) {
      console.log(`  skipped (already exists): ${c.slug}`);
      continue;
    }
    const caseId = inserted.id;

    if (body.length) {
      await db.insert(schema.caseBody).values(
        body.map((paragraph, idx) => ({ caseId, paragraph, sortOrder: idx }))
      ).onConflictDoNothing();
    }
    if (tags.length) {
      await db.insert(schema.caseTags).values(
        tags.map((tag) => ({ caseId, tag }))
      ).onConflictDoNothing();
    }
    if (creators.length) {
      await db.insert(schema.caseCreators).values(
        creators.map((creatorName) => ({ caseId, creatorName }))
      ).onConflictDoNothing();
    }

    console.log(`  inserted: ${c.slug}`);
  }

  // 7. Portfolio items
  console.log('Inserting portfolio items...');
  await db.insert(schema.portfolioItems).values(PORTFOLIO_DATA).onConflictDoNothing();
  console.log(`  ${PORTFOLIO_DATA.length} portfolio items`);

  // 8. Blog posts
  console.log('Inserting blog posts...');
  for (const p of POSTS_DATA) {
    await db
      .insert(schema.posts)
      .values(p)
      .onConflictDoNothing();
    console.log(`  inserted post: ${p.slug}`);
  }

  console.log('\nSeed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
