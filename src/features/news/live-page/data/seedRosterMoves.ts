/**
 * Roster moves recientes — seed estático Fase 1. Datos editorial-style
 * con slots [PLAYER] cuando no hay confirmación pública. Migrar a tabla
 * DB en Fase 2 cuando llegue admin CRUD.
 */
export type SeedRosterMove = {
  readonly id: string;
  readonly date: Date;
  readonly team: string;
  readonly type: 'in' | 'out' | 'bench' | 'role-change';
  readonly playerName: string;
  readonly note: string;
  readonly region: 'eu' | 'es' | 'latam' | 'global';
};

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
};

export const SEED_ROSTER_MOVES: readonly SeedRosterMove[] = [
  {
    id: 'nemiga-in-1',
    date: daysAgo(1),
    team: 'NEMIGA',
    type: 'in',
    playerName: '[PLAYER]',
    note: 'Fichaje cerrado tras pre-mover el roster de cara al cierre de split. AWP veterano de tier 1 con presupuesto ajustado.',
    region: 'eu',
  },
  {
    id: 'genone-role-1',
    date: daysAgo(3),
    team: 'GENONE',
    type: 'role-change',
    playerName: '[IGL]',
    note: 'Cambio de IGL a mitad de split. Los próximos 8 partidos son la prueba real de la nueva voz coordinada.',
    region: 'eu',
  },
  {
    id: 'cybershoke-bench-1',
    date: daysAgo(5),
    team: 'CYBERSHOKE',
    type: 'bench',
    playerName: '[PLAYER]',
    note: 'Banco temporal tras racha de bajo rendimiento. La org busca alternativa de tier 2.',
    region: 'eu',
  },
  {
    id: 'partizan-in-1',
    date: daysAgo(7),
    team: 'PARTIZAN',
    type: 'in',
    playerName: '[YOUNG TALENT]',
    note: 'Apuesta por jugador joven salido de Main. Movimiento contracorriente — proyecto > estabilidad.',
    region: 'eu',
  },
];

export function getLatestRosterMoves(limit = 4): readonly SeedRosterMove[] {
  return [...SEED_ROSTER_MOVES]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}
