import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreatorSearchProfiles } from '@/features/admin/targets/components/CreatorSearchProfiles';
import { CreatorFeedbackForm } from '@/features/admin/targets/components/CreatorFeedbackForm';
import { CreatorAutomationRegistry } from '@/features/admin/targets/components/CreatorAutomationRegistry';
import { CreatorDiscoveryOverview } from '@/features/admin/targets/components/CreatorDiscoveryOverview';
import { DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';
import type { CreatorSearchProfile, listAutomationRegistry } from '@/lib/queries/creatorSearchProfiles';

const profile: CreatorSearchProfile = {
  id: 1, name: 'CS2 WORLDWIDE', config: DEFAULT_CREATOR_SEARCH_PROFILE, enabled: false, version: 7,
  nextRunAt: null, lastRunAt: null, createdBy: null, leaseToken: null, leaseUntil: null,
  createdAt: new Date('2026-09-05T12:00:00Z'), updatedAt: new Date('2026-09-05T12:00:00Z'),
};

function mountProfiles(canWrite = true): { save: jest.Mock; run: jest.Mock } {
  const save = jest.fn().mockResolvedValue({ ok: true, error: null });
  const run = jest.fn().mockResolvedValue({ ok: true, error: null });
  render(<CreatorSearchProfiles profiles={[profile]} canWrite={canWrite} saveAction={save} runAction={run} />);
  fireEvent.click(screen.getByText('Perfiles de búsqueda (1)'));
  return { save, run };
}

it('creates a paused profile and preserves keyword phrases/line breaks until submit', async () => {
  const { save, run } = mountProfiles();
  fireEvent.click(screen.getByRole('button', { name: 'Crear perfil de búsqueda' }));
  fireEvent.change(screen.getByLabelText('Nombre del perfil'), { target: { value: 'Nueva búsqueda ficticia' } });
  const keywords = screen.getByLabelText(/Palabras clave/);
  fireEvent.change(keywords, { target: { value: 'Counter Strike 2\nCS2 skins, CS2 gameplay\n' } });
  expect(keywords).toHaveValue('Counter Strike 2\nCS2 skins, CS2 gameplay\n');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Nueva búsqueda ficticia', enabled: false,
    keywords: ['Counter Strike 2', 'CS2 skins', 'CS2 gameplay'], markets: ['WORLDWIDE'], languages: [],
  }), undefined));
  expect(run).not.toHaveBeenCalled();
});

it('sends the original version when editing and never runs as a side effect of saving', async () => {
  const { save, run } = mountProfiles();
  fireEvent.click(screen.getByRole('button', { name: 'Editar CS2 WORLDWIDE' }));
  fireEvent.change(screen.getByLabelText('Ventana de actividad (días)'), { target: { value: '60' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ windowDays: 60, enabled: false }), { id: 1, version: 7 }));
  expect(run).not.toHaveBeenCalled();
});

it('keeps activation separate, reports the server gate and does not pretend it was activated', async () => {
  const { save, run } = mountProfiles();
  save.mockResolvedValue({ ok: false, error: 'Proveedor no habilitado para este propósito.' });
  fireEvent.click(screen.getByRole('button', { name: 'Activar CS2 WORLDWIDE' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Proveedor no habilitado'));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }), { id: 1, version: 7 });
  expect(screen.getByRole('button', { name: 'Ejecutar CS2 WORLDWIDE' })).toBeDisabled();
  expect(run).not.toHaveBeenCalled();
});

it('rejects invalid form values without calling the action', async () => {
  const { save } = mountProfiles();
  fireEvent.click(screen.getByRole('button', { name: 'Editar CS2 WORLDWIDE' }));
  fireEvent.change(screen.getByLabelText(/Palabras clave/), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('keywords'));
  expect(save).not.toHaveBeenCalled();
});

it('does not expose mutation controls in read-only mode', () => {
  const { save, run } = mountProfiles(false);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
});

it('requires explicit feedback and only submits the selected internal decision', async () => {
  const save = jest.fn();
  render(<CreatorFeedbackForm targetIds={[42]} status="descartado" pending={false} onSave={save} onCancel={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar decisión' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'inactive' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar decisión' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ targetId: 42, status: 'descartado', reason: 'inactive', note: '' }, expect.anything()));
  expect(screen.getByText(/no envía mensajes, emails ni crea acuerdos/)).toBeInTheDocument();
});

it('shows missing registry evidence as unknown, preserves zero, and hides raw failure text', () => {
  const entry: Awaited<ReturnType<typeof listAutomationRegistry>>[number] = {
    key: 'synthetic-discovery', name: 'Búsqueda ficticia', type: 'discovery', purpose: 'test', status: 'NEVER_RUN',
    enabled: false, lastStartedAt: null, lastSuccessAt: null, lastErrorAt: null, lastError: 'private@example.test token-secret',
    nextRunAt: null, durationMs: null, itemsProcessed: 0, usage: null, version: 'fixture-v1', evidence: null,
    observedAt: null, updatedAt: new Date('2026-09-05T12:00:00Z'),
  };
  render(<CreatorAutomationRegistry entries={[entry]} />);
  fireEvent.click(screen.getByText('Registro de automatizaciones (1)'));
  expect(screen.getByText(/Procesados: 0 · Duración: Sin medición · Peticiones: Sin medición · Coste: Sin medición/)).toBeInTheDocument();
  expect(screen.getByText(/Estado registrado: NEVER_RUN/)).toBeInTheDocument();
  expect(screen.queryByText(/private@example.test/)).not.toBeInTheDocument();
});

it('does not claim operational platforms or zero results before any discovery run exists', () => {
  render(<CreatorDiscoveryOverview runs={[]} />);
  expect(screen.getByText('Pendiente de primera ejecución verificada')).toBeInTheDocument();
  expect(screen.getAllByText('Sin dato')).toHaveLength(3);
  expect(screen.queryByText(/operativas/)).not.toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});

it('shows the explicit partial-run warning even when the operation returns ok true', async () => {
  const run = jest.fn().mockResolvedValue({ ok: true, error: 'Ejecución parcial: Twitch sin permiso confirmado.' });
  render(<CreatorSearchProfiles profiles={[{ ...profile, enabled: true }]} canWrite
    saveAction={jest.fn()} runAction={run} />);
  fireEvent.click(screen.getByText('Perfiles de búsqueda (1)'));
  fireEvent.click(screen.getByRole('button', { name: 'Ejecutar CS2 WORLDWIDE' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Ejecución parcial: Twitch sin permiso confirmado.'));
  expect(screen.getByRole('status')).not.toHaveTextContent('Solicitud completada.');
  expect(run).toHaveBeenCalledTimes(1);
});
