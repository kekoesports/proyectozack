/**
 * Comportamiento de la UI de racha diaria.
 *
 * Regresión 2026-07-10: la lógica antigua (`displayedStreak = claimedToday ?
 * currentDay : Math.max(0, currentDay - 1)` + `isToday = day === currentDay
 * && !claimedToday`) causaba un desfase visual — el usuario, tras reclamar
 * el día N ayer, veía "Racha N-1" y botón "Reclamar día N" cuando en
 * realidad su próximo día era N+1. Estos tests bloquean esa regresión.
 */

import { render, screen } from '@testing-library/react';
import { DailyStreakCard } from '@/features/giveaway-platform/components/DailyStreakCard';

jest.mock('@/app/sorteos/plataforma/actions', () => ({
  claimDailyReward: jest.fn().mockResolvedValue({ ok: true }),
}));

describe('DailyStreakCard — display de racha y botón "Reclamar"', () => {
  function firstMatchingButtonInDay(day: number): HTMLButtonElement | null {
    // El grid renderiza 7 casillas .gp-streak-day; el botón "Reclamar"
    // sólo aparece en la que es "hoy pendiente". Filtramos por el label
    // "Día N" que hay dentro de cada casilla.
    const cells = screen.getAllByText(/^Día \d$/);
    const cell = cells.find((el) => el.textContent === `Día ${day}`);
    const container = cell?.closest('.gp-streak-day');
    return container?.querySelector('button.gp-streak-claim') ?? null;
  }

  it('[fresh] usuario nunca reclamó → "Racha 0 días", botón en día 1', () => {
    render(<DailyStreakCard currentDay={0} claimedToday={false} />);
    expect(screen.getByText(/Racha actual:/)).toHaveTextContent('0 días');
    expect(firstMatchingButtonInDay(1)).not.toBeNull();
    // Ningún día pintado como reclamado
    expect(document.querySelectorAll('.gp-streak-day.is-claimed')).toHaveLength(0);
  });

  it('[claimed today] reclamó día 3 hoy → "Racha 3 días", 1-3 con ✓, sin botón', () => {
    render(<DailyStreakCard currentDay={3} claimedToday={true} />);
    expect(screen.getByText(/Racha actual:/)).toHaveTextContent('3 días');
    expect(document.querySelectorAll('.gp-streak-day.is-claimed')).toHaveLength(3);
    // No hay botón en ningún día del grid
    expect(document.querySelectorAll('button.gp-streak-claim')).toHaveLength(0);
  });

  it('[claimed yesterday] reclamó día 3 ayer, hoy pendiente → "Racha 3 días", 1-3 ✓, botón en día 4', () => {
    // ← regresión antigua: mostraba "2 días" y botón en día 3.
    render(<DailyStreakCard currentDay={3} claimedToday={false} />);
    expect(screen.getByText(/Racha actual:/)).toHaveTextContent('3 días');
    expect(document.querySelectorAll('.gp-streak-day.is-claimed')).toHaveLength(3);
    expect(firstMatchingButtonInDay(4)).not.toBeNull();
    expect(firstMatchingButtonInDay(3)).toBeNull();
  });

  it('[rollover 7→1] reclamó día 7 ayer → siguiente pendiente es día 1', () => {
    // Tras 7 días completos, el server rota a día 1. Antes del claim de
    // hoy la UI aún ve currentDay=7 — pendingDay debe ser 1, no 8.
    render(<DailyStreakCard currentDay={7} claimedToday={false} />);
    expect(screen.getByText(/Racha actual:/)).toHaveTextContent('7 días');
    expect(firstMatchingButtonInDay(1)).not.toBeNull();
  });

  it('[rollover 7 claimed] acaba de reclamar día 7 → 1-7 ✓ sin botón', () => {
    render(<DailyStreakCard currentDay={7} claimedToday={true} />);
    expect(screen.getByText(/Racha actual:/)).toHaveTextContent('7 días');
    expect(document.querySelectorAll('.gp-streak-day.is-claimed')).toHaveLength(7);
    expect(document.querySelectorAll('button.gp-streak-claim')).toHaveLength(0);
  });

  it('[streak broken] racha rota → 0 días, botón en día 1 (aunque currentDay del server sea 5)', () => {
    // Si en DB queda `currentDay=5` pero no reclamó ni ayer, el próximo
    // claim va a resetear a día 1. La UI anticipa ese estado en vez de
    // pintar "Racha 5" + botón "Reclamar día 6" — sería engañoso porque
    // el usuario acabaría recibiendo 10 coins (día 1) creyendo que iba
    // a recibir 40 (día 6).
    render(<DailyStreakCard currentDay={5} claimedToday={false} streakBroken={true} />);
    expect(screen.getByText(/Racha actual:/)).toHaveTextContent('0 días');
    expect(document.querySelectorAll('.gp-streak-day.is-claimed')).toHaveLength(0);
    expect(firstMatchingButtonInDay(1)).not.toBeNull();
    expect(firstMatchingButtonInDay(6)).toBeNull();
  });

  it('[regresión 2026-07-10] "Racha N días" iguala al último día reclamado, nunca N-1', () => {
    // Antes: currentDay=2, claimedToday=false → "Racha 1 día". Ahora debe
    // decir "Racha 2 días". Este test bloquea el reintroducir el "- 1".
    render(<DailyStreakCard currentDay={2} claimedToday={false} />);
    expect(screen.getByText(/Racha actual:/)).toHaveTextContent('2 días');
    expect(screen.getByText(/Racha actual:/)).not.toHaveTextContent('1 días');
  });
});
