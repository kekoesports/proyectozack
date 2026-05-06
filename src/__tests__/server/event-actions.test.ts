/**
 * Smoke tests para tareas/event-actions.
 * Verifica validación, permisos y que el creador siempre queda como asistente.
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next/headers', () => ({ headers: jest.fn().mockResolvedValue({}) }));

const mockRequireAnyRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: (...args: unknown[]) => mockRequireAnyRole(...args),
}));

const mockCreateCrmEvent = jest.fn();
const mockDeleteCrmEvent = jest.fn();
jest.mock('@/lib/queries/crmEvents', () => ({
  createCrmEvent: (...args: unknown[]) => mockCreateCrmEvent(...args),
  deleteCrmEvent: (...args: unknown[]) => mockDeleteCrmEvent(...args),
}));

jest.mock('@/lib/queries/alerts', () => ({
  createAlert: jest.fn().mockResolvedValue(undefined),
}));

import { createEventAction, deleteEventAction } from '@/app/admin/(dashboard)/tareas/event-actions';

const SESSION = { user: { id: 'creator-1', email: 'a@b.com', name: 'Admin', role: 'admin' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAnyRole.mockResolvedValue(SESSION);
  mockCreateCrmEvent.mockResolvedValue({ id: 99, title: 'Test', attendees: ['creator-1'] });
});

const validInput = {
  title: 'Reunión semanal',
  date: '2026-06-10',
  startTime: '10:00',
  endTime: '11:00',
  attendees: [],
};

describe('createEventAction', () => {
  it('crea evento correctamente con datos válidos', async () => {
    const result = await createEventAction(validInput);
    expect(result).toEqual({});
    expect(mockCreateCrmEvent).toHaveBeenCalledTimes(1);
  });

  it('incluye al creador en attendees aunque no se pase', async () => {
    await createEventAction({ ...validInput, attendees: ['other-user'] });
    const call = mockCreateCrmEvent.mock.calls[0]?.[0] as { attendees: string[] };
    expect(call.attendees).toContain('creator-1');
    expect(call.attendees).toContain('other-user');
  });

  it('devuelve error si falta title', async () => {
    const result = await createEventAction({ ...validInput, title: '' });
    expect(result.error).toBeTruthy();
    expect(mockCreateCrmEvent).not.toHaveBeenCalled();
  });

  it('devuelve error si falta date', async () => {
    const result = await createEventAction({ ...validInput, date: '' });
    expect(result.error).toBeTruthy();
    expect(mockCreateCrmEvent).not.toHaveBeenCalled();
  });

  it('acepta evento sin endTime', async () => {
    const result = await createEventAction({ ...validInput, endTime: '' });
    expect(result).toEqual({});
    expect(mockCreateCrmEvent).toHaveBeenCalledWith(
      expect.objectContaining({ endAt: null }),
    );
  });
});

describe('deleteEventAction', () => {
  it('elimina evento con id válido', async () => {
    mockDeleteCrmEvent.mockResolvedValue(undefined);
    const result = await deleteEventAction(99);
    expect(result).toEqual({});
    expect(mockDeleteCrmEvent).toHaveBeenCalledWith(99, 'creator-1');
  });

  it('devuelve error con id inválido', async () => {
    const result = await deleteEventAction('no-un-id');
    expect(result.error).toBeTruthy();
    expect(mockDeleteCrmEvent).not.toHaveBeenCalled();
  });
});
