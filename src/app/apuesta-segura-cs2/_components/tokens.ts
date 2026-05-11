export const TELEGRAM_URL = 'https://t.me/+B65oaDw_4jhmNDFk';
export const BLOGABET_URL = 'https://arkeroz.blogabet.com';

// Datos sincronizados manualmente con el perfil público de Blogabet.
// Blogabet no expone RSS ni API pública (probado: /feed /rss /rss.xml todos
// devuelven HTML del homepage). Para automatizar requeriría Playwright
// scraping, opción aplazada — actualizar a mano cuando cambien los KPIs.
// Última sincronización: 2026-05-09 (capturas Blogabet + Excel beneficios).

export const HERO_STATS = [
  { label: 'Picks', value: '109' },
  { label: 'Yield', value: '+27%' },
  { label: 'Winrate', value: '67%' },
  { label: 'Profit', value: '+223u' },
];

export const KPIS = [
  { label: 'Picks publicadas', value: '109', tag: 'mayo 25 → mayo 26' },
  { label: 'Yield', value: '+27%', tag: 'rendimiento sobre stake' },
  { label: 'Winrate', value: '67%', tag: 'ratio won · 26% lost' },
  { label: 'Profit acumulado', value: '+223u', tag: 'unidades · histórico abierto' },
];

export const PROFIT_CURVE_REAL = [
  55, 62, 70, 78, 85, 92, 100, 108, 116, 122, 175, 222,
];
export const PROFIT_CURVE_LABELS = [
  'May 25',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
  'Ene 26',
  'Feb',
  'Mar',
  'May 26',
];

export const MONTHLY_EUR_2026 = [
  { m: 'Enero', v: 430 },
  { m: 'Febrero', v: 1860 },
  { m: 'Marzo', v: 6038 },
  { m: 'Abril', v: 6206 },
];
export const YEAR_TOTAL_2026 = 14534;
export const YEAR_LABEL = 'Beneficio neto · Ene–Abr 2026';

export const TOP_SPORTS = { esports: 67, combos: 33 };
export const WIN_LOSS = { won: 67, lost: 26 };

export const COVERAGE = [
  'ESEA Advanced',
  'ESEA Main',
  'Tier 2 EU',
  'CCT Europe',
  'Elisa Masters',
  'Thunderpick',
  'Tier 3 EU',
  'European RMR',
  'Open Qualifiers',
  'IEM Katowice',
  'BLAST Open',
  'ESL Pro League',
];

export const MAPS_POOL = [
  'Mirage',
  'Inferno',
  'Nuke',
  'Ancient',
  'Anubis',
  'Dust 2',
  'Train',
];

/**
 * Picks editoriales más recientes del canal Telegram "Apuesta Segura CS2".
 * Combinada 11-05-2026 @2.30 stake 10/10. Status 'pending' = match no
 * jugado, pick ofrecido (UI: "Próxima"). Si terminó ganando, cambia a
 * 'win' + añade `score`. Si una está en vivo, cambia su status a 'live'.
 */
export type PickStatus = 'live' | 'win' | 'pending';
export type PickPreview = {
  league: string;
  teamA: string;
  teamB: string;
  map: string;
  market: string;
  odds: string;
  stake: string;
  when: string;
  status: PickStatus;
  score?: string;
};

export const PICK_PREVIEWS: PickPreview[] = [
  {
    league: 'ESEA Advanced',
    teamA: 'CC.FE',
    teamB: 'PROJECT 91',
    map: 'Mapa 1',
    market: 'Over 18.5 rondas mapa 1',
    odds: '1.80',
    stake: 'Combinada',
    when: 'Hoy · 13:36',
    status: 'pending',
  },
  {
    league: 'ESEA Advanced',
    teamA: 'COW',
    teamB: 'BJNG',
    map: 'Match',
    market: 'BJNG ML',
    odds: '1.23',
    stake: 'Combinada',
    when: 'Hoy · 13:36',
    status: 'pending',
  },
  {
    league: 'ESEA Advanced',
    teamA: 'DIAMANT ESPORTS',
    teamB: 'SE7ENS',
    map: 'Match',
    market: 'Diamant ML',
    odds: '1.04',
    stake: 'Combinada',
    when: 'Hoy · 13:36',
    status: 'pending',
  },
];

export const STEPS = [
  {
    n: '01',
    title: 'Seguimiento diario',
    desc: 'Cobertura constante de ESEA Advanced, Main y tier 1–3 europeo. Calendario, narrativa competitiva y contexto previo.',
  },
  {
    n: '02',
    title: 'Análisis competitivo',
    desc: 'Vetos, mapas, rosters, forma reciente, head-to-head y contexto del torneo. El mismo workflow que aplica un equipo profesional.',
  },
  {
    n: '03',
    title: 'Value betting',
    desc: 'Picks únicamente cuando hay valor real frente a la cuota. Sin volumen forzado. Stake calibrado según convicción.',
  },
  {
    n: '04',
    title: 'Histórico abierto',
    desc: 'Todo se publica en Blogabet antes del partido. Histórico público, self-graded, sin selección posterior.',
  },
];
