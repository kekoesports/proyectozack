import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TargetsWorkspace } from '@/features/admin/targets/components/TargetsWorkspace';
import {
  updateStatusAction, updateNotesAction, deleteTargetsAction,
  assignTargetsToBrandAction, importCSVAction, bulkUpdateStatusAction,
} from '@/app/admin/(dashboard)/targets/actions';
import { runCreatorDiscoveryNowAction } from '@/app/admin/(dashboard)/targets/discovery-actions';
import { updateCreatorFeedbackAction } from '@/app/admin/(dashboard)/targets/profile-actions';
import type { Target } from '@/types';

jest.mock('next/navigation', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ refresh: jest.fn() }),
    useSearchParams: () => new URLSearchParams(React.useSyncExternalStore(
      (notify) => {
        window.addEventListener('popstate', notify);
        return () => window.removeEventListener('popstate', notify);
      },
      () => window.location.search,
      () => '',
    )),
  };
});

jest.mock('@/app/admin/(dashboard)/targets/actions', () => ({
  updateStatusAction: jest.fn(), updateNotesAction: jest.fn(), deleteTargetsAction: jest.fn(),
  assignTargetsToBrandAction: jest.fn(), importCSVAction: jest.fn(), bulkUpdateStatusAction: jest.fn(),
}));
jest.mock('@/app/admin/(dashboard)/targets/discovery-actions', () => ({ runCreatorDiscoveryNowAction: jest.fn() }));
jest.mock('@/app/admin/(dashboard)/targets/profile-actions', () => ({ updateCreatorFeedbackAction: jest.fn() }));
jest.mock('@/features/admin/targets/components/YouTubeTargetDiscovery', () => ({ YouTubeTargetDiscovery: () => <div>Formulario YouTube</div> }));
jest.mock('@/features/admin/targets/components/TwitchTargetDiscovery', () => ({ TwitchTargetDiscovery: () => <div>Formulario Twitch</div> }));
jest.mock('@/features/admin/targets/components/DirectProfileDiscovery', () => ({
  DirectProfileDiscovery: ({ platform }: { platform: string }) => <div>Formulario {platform}</div>,
}));

function fixture(id: number, platform: Target['platform'], status: Target['status'] = 'pendiente'): Target {
  const now = new Date('2026-09-05T12:00:00Z');
  return {
    id, platform, status, username: `fixture-${platform}-${id}`, fullName: `Fixture ${platform} ${id}`,
    profileUrl: `https://example.test/${id}`, profilePicUrl: null,
    followers: 1000, following: null, posts: null, bio: null, externalUrl: null,
    countryCode: null, defaultLanguage: null, lastVideoAt: null, recentVideoCount: null,
    minRecentVideoViews: null, avgRecentVideoViews: null, recentVideosWindowDays: null,
    qualificationUpdatedAt: null, complianceActivity: null, complianceStatus: null,
    complianceSourceUrl: null, complianceCheckedAt: null, contactEmail: null, contactUrl: null,
    qualificationStatus: 'review', fitScore: 0, fitReasons: [], sourceQuery: null,
    lastActivityAt: null, lastDiscoveredAt: now, isPrivate: null, isVerified: null,
    isBusiness: null, isCreator: null, businessCategory: null, brandUserId: null, notes: null,
    discoveredVia: 'synthetic-test', importBatchId: null, enrichedAt: null, contactedAt: null,
    createdAt: now, updatedAt: now,
  };
}

const targets = [fixture(1, 'youtube'), fixture(2, 'twitch'), fixture(3, 'instagram'), fixture(4, 'kick'), fixture(5, 'twitch', 'contactado')];
let expectedFeedbackCalls = 0;
let expectedDeleteCalls = 0;

function mountTargets(data: Target[] = targets): ReturnType<typeof render> {
  return render(<TargetsWorkspace targets={data} brands={[]} />);
}

beforeEach(() => {
  expectedFeedbackCalls = 0;
  expectedDeleteCalls = 0;
  jest.mocked(updateCreatorFeedbackAction).mockReset();
  jest.mocked(deleteTargetsAction).mockReset();
  window.history.replaceState(null, '', '/admin/targets');
  const nativePush = window.history.pushState.bind(window.history);
  // jsdom has no Next router: emulate only its documented pushState -> searchParams subscription.
  jest.spyOn(window.history, 'pushState').mockImplementation((data: unknown, unused: string, url?: string | URL | null) => {
    nativePush(data, unused, url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
});

afterEach(() => {
  try {
    for (const action of [updateStatusAction, updateNotesAction,
      assignTargetsToBrandAction, importCSVAction, bulkUpdateStatusAction, runCreatorDiscoveryNowAction]) {
      expect(action).not.toHaveBeenCalled();
    }
    expect(updateCreatorFeedbackAction).toHaveBeenCalledTimes(expectedFeedbackCalls);
    expect(deleteTargetsAction).toHaveBeenCalledTimes(expectedDeleteCalls);
  } finally {
    jest.restoreAllMocks();
  }
});

it('selecting the upper Twitch button filters the table, not only its search form', () => {
  mountTargets();
  fireEvent.click(screen.getByRole('button', { name: 'Twitch BÚSQUEDA' }));
  expect(screen.getByText('Formulario Twitch')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture twitch 2' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture youtube 1' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture instagram 3' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture twitch 5' })).not.toBeInTheDocument();
  expect(new URLSearchParams(window.location.search).get('platforms')).toBe('twitch');
});

it('defaults to the same YouTube selection for the form and table', () => {
  mountTargets();
  expect(screen.getByText('Formulario YouTube')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture youtube 1' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture twitch 2' })).not.toBeInTheDocument();
});

it('allows table multiselect, keeps an included form active, and moves it when deselected', () => {
  mountTargets();
  fireEvent.click(screen.getByRole('button', { name: 'Twitch 2' }));
  expect(screen.getByText('Formulario YouTube')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture youtube 1' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture twitch 2' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture kick 4' })).not.toBeInTheDocument();
  expect(screen.getByText('Tabla: YouTube + Twitch')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'YouTube 1' }));
  expect(screen.getByText('Formulario Twitch')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture youtube 1' })).not.toBeInTheDocument();
});

it('restores the URL filter after remount and keeps unrelated query parameters and hash', () => {
  window.history.replaceState(null, '', '/admin/targets?campaign=fixture#leads');
  const view = mountTargets();
  fireEvent.click(screen.getByRole('button', { name: 'Twitch BÚSQUEDA' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kick 1' }));
  expect(window.location.search).toContain('campaign=fixture');
  expect(window.location.hash).toBe('#leads');
  view.unmount();
  mountTargets();
  expect(screen.getByText('Formulario Twitch')).toBeInTheDocument();
  expect(screen.getByText('Tabla: Twitch + Kick')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture kick 4' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture youtube 1' })).not.toBeInTheDocument();
});

it('restores table and form together on browser back and forward', async () => {
  mountTargets();
  fireEvent.click(screen.getByRole('button', { name: 'Twitch BÚSQUEDA' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kick BÚSQUEDA' }));
  await act(async () => window.history.back());
  await waitFor(() => expect(screen.getByText('Formulario Twitch')).toBeInTheDocument());
  expect(screen.queryByRole('link', { name: 'Fixture kick 4' })).not.toBeInTheDocument();
  await act(async () => window.history.forward());
  await waitFor(() => expect(screen.getByText('Formulario kick')).toBeInTheDocument());
  expect(screen.queryByRole('link', { name: 'Fixture twitch 2' })).not.toBeInTheDocument();
});

it('persists an explicit all-platforms selection instead of reverting to YouTube on reload', () => {
  const view = mountTargets();
  fireEvent.click(screen.getByRole('button', { name: 'YouTube 1' }));
  expect(new URLSearchParams(window.location.search).get('platforms')).toBe('all');
  expect(screen.getByText('Tabla: todas las redes')).toBeInTheDocument();
  view.unmount();
  mountTargets();
  expect(screen.getByRole('link', { name: 'Fixture instagram 3' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture twitch 2' })).toBeInTheDocument();
});

it('retains an empty selected platform chip so it can be cleared', () => {
  mountTargets([fixture(2, 'twitch')]);
  expect(screen.getByText('Sin resultados para los filtros aplicados')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'YouTube 0' }));
  expect(screen.getByRole('link', { name: 'Fixture twitch 2' })).toBeInTheDocument();
});

it.each(['unknown', 'youtube,unknown', '', 'all,twitch', 'youtube&platforms=twitch'])(
  'does not broaden the table for invalid or ambiguous URL platforms=%s', (value) => {
    window.history.replaceState(null, '', `/admin/targets?platforms=${value}`);
    mountTargets();
    expect(screen.getByText('Formulario YouTube')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fixture twitch 2' })).not.toBeInTheDocument();
  },
);

it('deduplicates a valid URL selection without duplicating rendered rows', () => {
  window.history.replaceState(null, '', '/admin/targets?platforms=twitch,twitch,youtube');
  mountTargets();
  expect(screen.getByText('Tabla: Twitch + YouTube')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Fixture twitch 2' })).toHaveLength(1);
});

it('preserves the local status filter when choosing a different discovery platform', () => {
  mountTargets();
  fireEvent.click(screen.getByRole('button', { name: 'Contactado 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Twitch BÚSQUEDA' }));
  expect(screen.getByRole('link', { name: 'Fixture twitch 5' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture twitch 2' })).not.toBeInTheDocument();
});

it('does not drop back-to-back multiselect clicks before React renders', () => {
  mountTargets();
  const twitch = screen.getByRole('button', { name: 'Twitch 2' });
  const kick = screen.getByRole('button', { name: 'Kick 1' });
  act(() => { twitch.click(); kick.click(); });
  expect(screen.getByText('Tabla: YouTube + Twitch + Kick')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture twitch 2' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Fixture kick 4' })).toBeInTheDocument();
});

it('renders a measured zero and sorts unknown audience last in both directions', () => {
  const data = [
    { ...fixture(1, 'youtube'), followers: null },
    { ...fixture(2, 'youtube'), followers: 0 },
    { ...fixture(3, 'youtube'), followers: 2000 },
  ];
  mountTargets(data);
  const audience = screen.getByText('Audiencia');
  const visibleNames = (): string[] => screen.getAllByRole('row').slice(1).map((row) => within(row).getByRole('link', { name: /Fixture/ }).textContent ?? '');
  fireEvent.click(audience);
  expect(visibleNames()).toEqual(['Fixture youtube 3', 'Fixture youtube 2', 'Fixture youtube 1']);
  fireEvent.click(screen.getByText(/Audiencia/));
  expect(visibleNames()).toEqual(['Fixture youtube 2', 'Fixture youtube 3', 'Fixture youtube 1']);
  expect(within(screen.getAllByRole('row')[1]!).getByText('0')).toBeInTheDocument();
  expect(within(screen.getAllByRole('row')[3]!).getAllByRole('cell')[3]).toHaveTextContent('—');
});

it('does not mutate status until an individual decision is submitted with its reason', async () => {
  jest.mocked(updateCreatorFeedbackAction).mockResolvedValue({ ok: true, error: null });
  mountTargets([fixture(1, 'youtube')]);
  fireEvent.click(screen.getByRole('button', { name: 'Pendiente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Descartado' }));
  expect(updateCreatorFeedbackAction).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'inactive' } });
  expectedFeedbackCalls = 1;
  fireEvent.click(screen.getByRole('button', { name: 'Guardar decisión' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 decisiones registradas'));
  expect(updateCreatorFeedbackAction).toHaveBeenCalledWith({ targetId: 1, status: 'descartado', reason: 'inactive', note: '' });
});

it('stops bulk feedback on the first failure and reports partial work without retry', async () => {
  jest.mocked(updateCreatorFeedbackAction)
    .mockResolvedValueOnce({ ok: true, error: null })
    .mockResolvedValueOnce({ ok: false, error: 'Recarga el listado.' });
  window.history.replaceState(null, '', '/admin/targets?platforms=all');
  mountTargets();
  const selectAll = within(screen.getByRole('table')).getAllByRole('checkbox')[0];
  if (!selectAll) throw new Error('Missing synthetic table selector');
  fireEvent.click(selectAll);
  fireEvent.click(screen.getByRole('button', { name: 'Descartado' }));
  expect(updateCreatorFeedbackAction).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'wrong_content' } });
  expectedFeedbackCalls = 2;
  fireEvent.click(screen.getByRole('button', { name: 'Guardar decisión' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1/4 decisiones guardadas'));
  expect(screen.queryByRole('button', { name: 'Guardar decisión' })).not.toBeInTheDocument();
});

function selectVisibleRows(): void {
  const checkbox = within(screen.getByRole('table')).getAllByRole('checkbox')[0];
  if (!checkbox) throw new Error('Missing table selection control');
  fireEvent.click(checkbox);
}

async function submitDiscard(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Descartado' }));
  fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'wrong_content' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar decisión' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 decisiones registradas'));
}

it('does not include hidden YouTube selections after switching to Twitch', async () => {
  jest.mocked(updateCreatorFeedbackAction).mockResolvedValue({ ok: true, error: null });
  mountTargets();
  selectVisibleRows();
  expect(screen.getByText('1 seleccionado')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Twitch BÚSQUEDA' }));
  expect(screen.queryByText('1 seleccionado')).not.toBeInTheDocument();
  const checkbox = within(screen.getByRole('table')).getAllByRole('checkbox')[0];
  expect(checkbox).not.toBeChecked();
  selectVisibleRows();
  expect(screen.getByText('1 seleccionado')).toBeInTheDocument();
  expectedFeedbackCalls = 1;
  await submitDiscard();
  expect(updateCreatorFeedbackAction).toHaveBeenCalledWith(expect.objectContaining({ targetId: 2 }));
});

it('does not include selected pending profiles after switching the status filter', async () => {
  jest.mocked(updateCreatorFeedbackAction).mockResolvedValue({ ok: true, error: null });
  window.history.replaceState(null, '', '/admin/targets?platforms=all');
  mountTargets();
  selectVisibleRows();
  expect(screen.getByText('4 seleccionados')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Contactado 1' }));
  expect(screen.queryByText('4 seleccionados')).not.toBeInTheDocument();
  selectVisibleRows();
  expectedFeedbackCalls = 1;
  await submitDiscard();
  expect(updateCreatorFeedbackAction).toHaveBeenCalledWith(expect.objectContaining({ targetId: 5 }));
});

it('counts, clears and submits only visible selected profiles after a text search', async () => {
  jest.mocked(updateCreatorFeedbackAction).mockResolvedValue({ ok: true, error: null });
  window.history.replaceState(null, '', '/admin/targets?platforms=all');
  mountTargets();
  selectVisibleRows();
  fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, usuario o bio...'), { target: { value: 'fixture-kick' } });
  expect(screen.getByText('1 seleccionado')).toBeInTheDocument();
  expect(within(screen.getByRole('table')).getAllByRole('checkbox')[0]).toBeChecked();
  selectVisibleRows();
  expect(screen.queryByText('1 seleccionado')).not.toBeInTheDocument();
  selectVisibleRows();
  expectedFeedbackCalls = 1;
  await submitDiscard();
  expect(updateCreatorFeedbackAction).toHaveBeenCalledWith(expect.objectContaining({ targetId: 4 }));
});

it('revalidates a pending bulk decision against the visible rows at submit time', async () => {
  jest.mocked(updateCreatorFeedbackAction).mockResolvedValue({ ok: true, error: null });
  window.history.replaceState(null, '', '/admin/targets?platforms=all');
  mountTargets();
  selectVisibleRows();
  fireEvent.click(screen.getByRole('button', { name: 'Descartado' }));
  fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, usuario o bio...'), { target: { value: 'fixture-kick' } });
  expect(screen.getByRole('heading', { name: 'Registrar Descartado en 1 perfil' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'wrong_content' } });
  expectedFeedbackCalls = 1;
  fireEvent.click(screen.getByRole('button', { name: 'Guardar decisión' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 decisiones registradas'));
  expect(updateCreatorFeedbackAction).toHaveBeenCalledWith(expect.objectContaining({ targetId: 4 }));
});

it('archives only the visible selected Twitch row, never a hidden selected YouTube row', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.mocked(deleteTargetsAction).mockResolvedValue();
  mountTargets();
  selectVisibleRows();
  fireEvent.click(screen.getByRole('button', { name: 'Twitch BÚSQUEDA' }));
  selectVisibleRows();
  expectedDeleteCalls = 1;
  fireEvent.click(screen.getByText('Archivar', { selector: 'button' }));
  await waitFor(() => expect(deleteTargetsAction).toHaveBeenCalledTimes(1));
  const input = jest.mocked(deleteTargetsAction).mock.calls[0]?.[0];
  expect(input?.get('ids')).toBe('2');
  expect(confirm).toHaveBeenCalledWith('¿Archivar 1 lead? Se conservarán su identidad y su historial.');
});

it('keeps archived creators out of ordinary lists and totals but recoverable in the explicit tab', () => {
  mountTargets([fixture(1, 'youtube'), fixture(8, 'youtube', 'descartado')]);
  expect(screen.getByRole('button', { name: 'Todos 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'YouTube 1' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Todos 1' }));
  expect(screen.queryByRole('link', { name: 'Fixture youtube 8' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Descartado 1' }));
  expect(screen.getByRole('link', { name: 'Fixture youtube 8' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture youtube 1' })).not.toBeInTheDocument();
  expect(screen.getByText(/Archivo recuperable/)).toBeInTheDocument();
});

it('does not include an archived selection in ordinary bulk actions after leaving the archive', () => {
  mountTargets([fixture(1, 'youtube'), fixture(8, 'youtube', 'descartado')]);
  fireEvent.click(screen.getByRole('button', { name: 'Descartado 1' }));
  selectVisibleRows();
  expect(screen.getByText('1 seleccionado')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Todos 1' }));
  expect(screen.queryByText('1 seleccionado')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Fixture youtube 8' })).not.toBeInTheDocument();
});
