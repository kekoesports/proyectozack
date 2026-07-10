/**
 * Fase 1 PR4 del audit del 2026-07-10: el ranking mensual debe pintar el
 * premio configurado al lado del top 1/2/3. Si el mes actual no está
 * configurado, degrada silenciosamente (sin premios inline). Si viene
 * con imagen, la renderiza; si no, muestra un emoji del podium.
 *
 * Mockea el helper `getCurrentPrizeForPosition` para independizar el
 * test del mes real de calendario.
 */

import { render, screen } from '@testing-library/react';
import { MonthlyPointsRanking } from '@/features/giveaway-platform/components/MonthlyPointsRanking';
import type { PointsRankingRow, UserMonthlyStanding } from '@/types/giveawayPlatform';
import * as prizesModule from '@/features/giveaway-platform/constants/prizes';

const mockedGetPrize = jest.spyOn(prizesModule, 'getCurrentPrizeForPosition');

function row(userId: string, name: string, points: number): PointsRankingRow {
  return {
    userId,
    displayName: name,
    avatarUrl: null,
    pointsEarned: points,
  };
}

const standingNone: UserMonthlyStanding | null = null;

afterEach(() => {
  mockedGetPrize.mockReset();
});

describe('MonthlyPointsRanking — premios inline en top 1/2/3', () => {
  it('cuando hay premios configurados con imagen, pinta el <img>', () => {
    mockedGetPrize.mockImplementation((pos) => {
      if (pos === 1) return { position: 1, title: 'Skin CS2 premium', imageUrl: '/prizes/1.png' };
      return null;
    });

    render(
      <MonthlyPointsRanking
        rows={[row('u1', 'zack', 500), row('u2', 'ana', 300)]}
        totalParticipants={2}
        myStanding={standingNone}
        isLoggedIn={false}
      />,
    );

    // El premio del puesto 1 se pinta con img.
    const prize1 = screen.getByLabelText('Premio para el puesto 1');
    expect(prize1).toBeInTheDocument();
    expect(prize1.querySelector('img')?.getAttribute('src')).toBe('/prizes/1.png');
    expect(prize1).toHaveTextContent('Skin CS2 premium');
    // El puesto 2 no tiene premio configurado → no aparece el bloque.
    expect(screen.queryByLabelText('Premio para el puesto 2')).not.toBeInTheDocument();
  });

  it('cuando el premio no tiene imageUrl, pinta el emoji del podium', () => {
    mockedGetPrize.mockImplementation((pos) => {
      if (pos === 1) return { position: 1, title: 'Premio mensual destacado' };
      if (pos === 2) return { position: 2, title: 'Premio mensual' };
      if (pos === 3) return { position: 3, title: 'Premio mensual' };
      return null;
    });

    render(
      <MonthlyPointsRanking
        rows={[
          row('u1', 'zack', 500),
          row('u2', 'ana', 300),
          row('u3', 'pep', 100),
        ]}
        totalParticipants={3}
        myStanding={standingNone}
        isLoggedIn={false}
      />,
    );

    expect(screen.getByLabelText('Premio para el puesto 1')).toHaveTextContent('🥇');
    expect(screen.getByLabelText('Premio para el puesto 2')).toHaveTextContent('🥈');
    expect(screen.getByLabelText('Premio para el puesto 3')).toHaveTextContent('🥉');
  });

  it('cuando el mes no está configurado (helper devuelve null), no rompe y no pinta premios', () => {
    mockedGetPrize.mockReturnValue(null);

    render(
      <MonthlyPointsRanking
        rows={[row('u1', 'zack', 500)]}
        totalParticipants={1}
        myStanding={standingNone}
        isLoggedIn={false}
      />,
    );

    expect(screen.queryByLabelText(/Premio para el puesto/)).not.toBeInTheDocument();
    // El ranking sigue pintando el usuario, sin errores.
    expect(screen.getByText('zack')).toBeInTheDocument();
  });

  it('el premio inline sólo aparece para las 3 primeras posiciones', () => {
    mockedGetPrize.mockImplementation((pos) => ({ position: pos as 1 | 2 | 3, title: `Top ${pos}` }));

    render(
      <MonthlyPointsRanking
        rows={[
          row('u1', 'u1', 500),
          row('u2', 'u2', 400),
          row('u3', 'u3', 300),
          row('u4', 'u4', 200),
          row('u5', 'u5', 100),
        ]}
        totalParticipants={5}
        myStanding={standingNone}
        isLoggedIn={false}
      />,
    );

    // Con el mock devolviendo siempre premio, verificamos que la UI
    // sólo consulta las 3 primeras posiciones — nunca la 4ª ni la 5ª.
    // (Aunque el mock devuelva algo, el componente no debe pintar
    // premios para posiciones > 3.)
    expect(screen.getByLabelText('Premio para el puesto 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Premio para el puesto 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Premio para el puesto 3')).toBeInTheDocument();
    expect(screen.queryByLabelText('Premio para el puesto 4')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Premio para el puesto 5')).not.toBeInTheDocument();
  });
});

describe('MonthlyPointsRanking — invariantes de accesibilidad', () => {
  it('el avatar fallback usa la inicial en mayúsculas del displayName', () => {
    mockedGetPrize.mockReturnValue(null);
    render(
      <MonthlyPointsRanking
        rows={[row('u1', 'zack', 500)]}
        totalParticipants={1}
        myStanding={standingNone}
        isLoggedIn={false}
      />,
    );
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('empty state cuando no hay filas', () => {
    mockedGetPrize.mockReturnValue(null);
    render(
      <MonthlyPointsRanking
        rows={[]}
        totalParticipants={0}
        myStanding={standingNone}
        isLoggedIn={false}
      />,
    );
    expect(screen.getByText(/Aún nadie ha ganado puntos este mes/i)).toBeInTheDocument();
  });
});
