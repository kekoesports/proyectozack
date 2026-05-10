/**
 * Matches semana — seed estático Fase 1. Sin tabla DB, sin migrations.
 * En Fase 2 (cuando montemos `matches` table + cron Liquipedia) se
 * reemplaza por una query DB sin tocar el componente consumidor.
 *
 * Estructura coincide con el modelo de datos previsto para la migration
 * futura: { league, format, scheduledAt, teamA, teamB, mapPool, region,
 * status }. Datos plausibles del tier 2 europeo CS2.
 *
 * IMPORTANTE: editar manualmente cuando cambien fechas/equipos. Cuando
 * el módulo de admin esté listo, se migrará a DB y este seed quedará
 * como fallback para builds estáticos.
 */
export type SeedMatch = {
  readonly slug: string;
  readonly league: string;
  readonly format: 'BO1' | 'BO3' | 'BO5';
  readonly scheduledAt: Date;
  readonly status: 'upcoming' | 'live' | 'finished';
  readonly teamA: string;
  readonly teamB: string;
  readonly scoreA: number | null;
  readonly scoreB: number | null;
  readonly map: string | null;
  readonly region: 'eu' | 'es' | 'latam' | 'global';
  readonly streamUrl: string | null;
};

const NOW = new Date();
const todayAt = (h: number, m = 0): Date => {
  const d = new Date(NOW);
  d.setHours(h, m, 0, 0);
  return d;
};
const inDays = (n: number, h: number, m = 0): Date => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
};

export const SEED_MATCHES: readonly SeedMatch[] = [
  {
    slug: 'cybershoke-vs-partizan-esea-advanced',
    league: 'ESEA Advanced S52',
    format: 'BO3',
    scheduledAt: todayAt(19, 0),
    status: 'upcoming',
    teamA: 'CYBERSHOKE',
    teamB: 'PARTIZAN',
    scoreA: null,
    scoreB: null,
    map: 'Mirage / Inferno',
    region: 'eu',
    streamUrl: null,
  },
  {
    slug: 'nemiga-vs-into-the-breach-cct',
    league: 'CCT Europe',
    format: 'BO3',
    scheduledAt: todayAt(21, 30),
    status: 'upcoming',
    teamA: 'NEMIGA',
    teamB: 'INTO THE BREACH',
    scoreA: null,
    scoreB: null,
    map: 'Anubis / Mirage',
    region: 'eu',
    streamUrl: null,
  },
  {
    slug: 'genone-vs-aura-cct',
    league: 'CCT Europe',
    format: 'BO1',
    scheduledAt: inDays(1, 17, 0),
    status: 'upcoming',
    teamA: 'GENONE',
    teamB: 'AURA',
    scoreA: null,
    scoreB: null,
    map: 'Inferno',
    region: 'eu',
    streamUrl: null,
  },
  {
    slug: 'falcons-vs-spirit-blast',
    league: 'BLAST.tv qualifier',
    format: 'BO3',
    scheduledAt: inDays(2, 19, 0),
    status: 'upcoming',
    teamA: 'FALCONS',
    teamB: 'SPIRIT',
    scoreA: null,
    scoreB: null,
    map: 'Best of 3',
    region: 'global',
    streamUrl: null,
  },
  {
    slug: 'esea-advanced-semifinal',
    league: 'ESEA Advanced S52 · Semifinal',
    format: 'BO3',
    scheduledAt: inDays(3, 18, 0),
    status: 'upcoming',
    teamA: '[TBD]',
    teamB: '[TBD]',
    scoreA: null,
    scoreB: null,
    map: null,
    region: 'eu',
    streamUrl: null,
  },
];

export function getMatchesToday(): readonly SeedMatch[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return SEED_MATCHES.filter(
    (m) => m.scheduledAt >= today && m.scheduledAt < tomorrow,
  );
}

export function getMatchesNext7Days(): readonly SeedMatch[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return SEED_MATCHES.filter(
    (m) => m.scheduledAt >= start && m.scheduledAt < end,
  ).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}
