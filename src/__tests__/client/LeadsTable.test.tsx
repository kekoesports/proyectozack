import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { updateLeadStatusAction } from '@/app/admin/(dashboard)/leads/actions';
import { LeadsTable } from '@/features/admin/leads/components/LeadsTable';
import type { LeadStatus, LeadWithAssignee } from '@/types';

jest.mock('@/app/admin/(dashboard)/leads/actions', () => ({
  updateLeadStatusAction: jest.fn(),
  assignLeadAction: jest.fn(),
}));

function lead(id: number, status: LeadStatus): LeadWithAssignee {
  return {
    id, status, name: `Prueba ${id}`, email: `fixture-${id}@example.test`, type: 'brand',
    message: 'Consulta sintética', company: null, phone: null, budget: null, timeline: null,
    audience: null, vertical: null, campaignType: null, country: null, platform: null,
    channelUrl: null, contentCategory: null, followers: null, averageAudience: null,
    otherLinks: null, viewers: null, monetization: null, ipHash: null, notes: null,
    assignedToId: null, assignedToName: null, respondedAt: null,
    createdAt: new Date('2026-09-14T10:00:00Z'),
  };
}

const leads = [lead(1, 'nuevo'), lead(2, 'interesante'), lead(3, 'contactado'), lead(4, 'ganado'), lead(5, 'descartado')];
const props = { leads, staff: [], currentUserId: 'fixture-user', canWrite: true };

beforeEach(() => jest.clearAllMocks());

it('opens only new leads and keeps contacted and closed leads accessible in their inboxes', async () => {
  const user = userEvent.setup();
  render(<LeadsTable {...props} />);
  expect(screen.getByRole('button', { name: 'Entrada 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: 'Prueba 1' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Prueba 2' })).not.toBeInTheDocument();
  // safe: fixed pairs preserve the label/name tuple types.
  const inboxCases = [['Interesantes 1', 'Prueba 2'], ['Contactados 1', 'Prueba 3'], ['Ganados 1', 'Prueba 4'], ['Descartados 1', 'Prueba 5']] as const;
  for (const [label, name] of inboxCases) {
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('link', { name })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Prueba 1' })).not.toBeInTheDocument();
  }
  await user.click(screen.getByRole('button', { name: 'Todos 5' }));
  expect(screen.getAllByRole('link', { name: /^Prueba / })).toHaveLength(5);
});

it('moves a saved contact on server refresh and can return it to the inbox', async () => {
  const user = userEvent.setup();
  jest.mocked(updateLeadStatusAction).mockResolvedValue({ ok: true });
  const { rerender } = render(<LeadsTable {...props} />);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Estado de Prueba 1' }), 'contactado');
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Lead movido a Contactados.'));
  expect(updateLeadStatusAction).toHaveBeenCalledWith({ id: 1, status: 'contactado' });
  // The existing Server Action revalidates the list; server props are the source of truth.
  rerender(<LeadsTable {...props} leads={[lead(1, 'contactado'), ...leads.slice(1)]} />);
  expect(screen.queryByRole('link', { name: 'Prueba 1' })).not.toBeInTheDocument();
  expect(screen.getByText(/Entrada al día/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Contactados 2' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Estado de Prueba 1' }), 'nuevo');
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Lead movido a Entrada.'));
  rerender(<LeadsTable {...props} />);
  expect(screen.queryByRole('link', { name: 'Prueba 1' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Entrada 1' }));
  expect(screen.getByRole('link', { name: 'Prueba 1' })).toBeInTheDocument();
});

it.each(['response', 'network'])('keeps the lead in the inbox when saving fails (%s)', async (failure) => {
  const user = userEvent.setup();
  if (failure === 'response') jest.mocked(updateLeadStatusAction).mockResolvedValue({ ok: false, error: 'No se pudo cambiar el estado' });
  else jest.mocked(updateLeadStatusAction).mockRejectedValue(new Error('Synthetic network failure'));
  render(<LeadsTable {...props} />);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Estado de Prueba 1' }), 'contactado');
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cambiar el estado');
  expect(screen.getByRole('link', { name: 'Prueba 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Entrada 1' })).toHaveAttribute('aria-pressed', 'true');
});

it('clears search within the current inbox and preserves read-only access', async () => {
  const user = userEvent.setup();
  render(<LeadsTable {...props} canWrite={false} />);
  await user.click(screen.getByRole('button', { name: 'Contactados 1' }));
  await user.type(screen.getByRole('textbox', { name: 'Buscar leads' }), 'no-match');
  expect(screen.getByText('Ningún lead coincide con estos filtros.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Limpiar' }));
  expect(screen.getByRole('button', { name: 'Contactados 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: 'Prueba 3' })).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: /^Estado de/ })).not.toBeInTheDocument();
  expect(updateLeadStatusAction).not.toHaveBeenCalled();
});
