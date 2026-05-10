/**
 * Calendario eventos clave próximos 7-14 días — seed estático Fase 1.
 * Eventos competitivos relevantes para la audiencia hispana CS2.
 *
 * Integra los matches del seedMatches automáticamente — esos cuentan
 * como un día con "N partidos". Eventos custom (majors, splits clave)
 * se añaden aquí manualmente.
 */
import { SEED_MATCHES, type SeedMatch } from './seedMatches';

export type CalendarHighlight = {
  readonly date: Date;
  readonly label: string;
  readonly accent: 'primary' | 'secondary' | 'subdued';
};

const inDays = (n: number, h = 12): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, 0, 0, 0);
  return d;
};

export const SEED_HIGHLIGHTS: readonly CalendarHighlight[] = [
  {
    date: inDays(2),
    label: 'BLAST.tv qualifier · Día 1',
    accent: 'primary',
  },
  {
    date: inDays(3),
    label: 'ESEA Advanced · Semifinal',
    accent: 'primary',
  },
  {
    date: inDays(5),
    label: 'CCT Europe · Stage finals',
    accent: 'secondary',
  },
];

export type CalendarDay = {
  readonly date: Date;
  readonly weekday: string;
  readonly dayLabel: string;
  readonly matchCount: number;
  readonly matches: readonly SeedMatch[];
  readonly highlights: readonly CalendarHighlight[];
};

const WEEKDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function getCalendar7Days(): readonly CalendarDay[] {
  const days: CalendarDay[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    const matches = SEED_MATCHES.filter(
      (m) => m.scheduledAt >= date && m.scheduledAt < next,
    );
    const highlights = SEED_HIGHLIGHTS.filter(
      (h) => h.date >= date && h.date < next,
    );

    days.push({
      date,
      weekday: WEEKDAYS_ES[date.getDay()] ?? '',
      dayLabel: String(date.getDate()),
      matchCount: matches.length,
      matches,
      highlights,
    });
  }

  return days;
}
