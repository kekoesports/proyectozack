import { fireEvent, render, screen } from '@testing-library/react';
import { StudioMetricChart } from '@/features/studio/StudioMetricChart';
import { StudioProjectBrowser } from '@/features/studio/StudioProjectBrowser';
import { StudioNavigation } from '@/features/studio/StudioNavigation';
import type { StudioMetricPoint } from '@/lib/studio/analytics';

const points: StudioMetricPoint[] = [
  { socialId: 1, platform: 'youtube', date: '2026-08-15', followers: 100, views: null, source: 'test-only' },
  { socialId: 1, platform: 'youtube', date: '2026-09-06', followers: 120, views: 0, source: 'test-only' },
  { socialId: 2, platform: 'twitch', date: '2026-09-06', followers: null, views: null, source: 'test-only' },
];

it('filters real observations by period/channel and provides an accessible exact table', () => {
  render(<StudioMetricChart points={points} today="2026-09-06" />);
  expect(screen.getByRole('img', { name: /Evolución de seguidores/ })).toBeInTheDocument();
  fireEvent.click(screen.getByText('Ver datos y fuentes del gráfico'));
  expect(screen.getByRole('table')).toHaveTextContent('test-only');
  fireEvent.click(screen.getByRole('button', { name: '7 días' }));
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByText('Ya hay un punto de partida.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Twitch/ }));
  expect(screen.getByText('Este periodo aún no tiene datos.')).toBeInTheDocument();
});

it('search and status filters combine without mutating projects', () => {
  render(<StudioProjectBrowser projects={[{ id: 'one', title: 'Proyecto A', template: 'educational', platform: 'tiktok', revision: 0, status: 'draft' }, { id: 'two', title: 'Proyecto B', template: 'educational', platform: 'tiktok', revision: 1, status: 'approved' }]} />);
  fireEvent.change(screen.getByLabelText('Buscar mis proyectos'), { target: { value: 'Proyecto A' } });
  fireEvent.change(screen.getByLabelText('Estado del proyecto'), { target: { value: 'approved' } });
  expect(screen.getByText('No encontramos esa pieza.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(screen.getByText('2 proyectos')).toBeInTheDocument();
});

it('mobile menu has an explicit toggle and closes on navigation', () => {
  render(<StudioNavigation active="/studio" />);
  fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('link', { name: 'Estadísticas' }));
  expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'false');
});
