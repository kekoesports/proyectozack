export const TELEGRAM_URL = 'https://t.me/apuestaseguracs2';
export const BLOGABET_URL = 'https://arkeroz.blogabet.com';

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

export const PICK_PREVIEWS = [
  {
    league: 'ESEA Advanced',
    teamA: 'CYBERSHOKE',
    teamB: 'PARTIZAN',
    map: 'Mirage',
    market: 'Over 22.5 rondas mapa 1',
    odds: '1.85',
    stake: '2/10',
    when: 'Hoy · 14:32',
    status: 'live' as const,
  },
  {
    league: 'CCT Europe',
    teamA: 'GENONE',
    teamB: 'AURA',
    map: 'Match',
    market: 'GenOne ML',
    odds: '2.10',
    stake: '3/10',
    when: 'Ayer · 22:15',
    status: 'win' as const,
    score: '2 – 1',
  },
  {
    league: 'ESEA Main',
    teamA: 'NEMIGA',
    teamB: 'INTO THE BREACH',
    map: 'Anubis',
    market: 'Hándicap +1.5',
    odds: '1.72',
    stake: '2/10',
    when: 'Ayer · 18:40',
    status: 'win' as const,
    score: '13 – 11',
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
