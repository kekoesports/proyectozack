jest.mock('server-only', () => ({}));

const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const mockRequirePermission = jest.fn();
jest.mock('@/lib/permissions', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

const mockResetCredential = jest.fn();
class MockStaffPasswordResetError extends Error {}
jest.mock('@/lib/auth/resetStaffPassword', () => ({
  resetStaffPasswordCredential: (...args: unknown[]) => mockResetCredential(...args),
  StaffPasswordResetError: MockStaffPasswordResetError,
}));

const mockLogRedacted = jest.fn();
jest.mock('@/lib/log', () => ({
  logRedacted: (...args: unknown[]) => mockLogRedacted(...args),
}));

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/db/schema', () => ({ user: {} }));
jest.mock('@/lib/email', () => ({ sendStaffInviteEmail: jest.fn() }));
jest.mock('@/lib/site-url', () => ({ absoluteUrl: jest.fn() }));
jest.mock('@/lib/auth', () => ({ auth: { api: {} } }));

import { resetStaffPasswordAction } from '@/app/admin/(dashboard)/equipo/actions';

beforeEach(() => {
  jest.clearAllMocks();
  mockRequirePermission.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
  mockResetCredential.mockResolvedValue(undefined);
});

describe('resetStaffPasswordAction', () => {
  it('exige el permiso específico de gestión de usuarios', async () => {
    await resetStaffPasswordAction('staff-1', 'UnaClaveNueva#2026', 'UnaClaveNueva#2026');

    expect(mockRequirePermission).toHaveBeenCalledWith('usuarios', 'manage_users');
  });

  it('actualiza la credencial sin pedir la contraseña anterior', async () => {
    const result = await resetStaffPasswordAction(
      'staff-1',
      'UnaClaveNueva#2026',
      'UnaClaveNueva#2026',
    );

    expect(result).toEqual({ success: true });
    expect(mockResetCredential).toHaveBeenCalledWith({
      userId: 'staff-1',
      newPassword: 'UnaClaveNueva#2026',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/equipo');
  });

  it.each([
    ['', 'UnaClaveNueva#2026', 'UnaClaveNueva#2026', 'ID inválido'],
    ['admin-1', 'UnaClaveNueva#2026', 'UnaClaveNueva#2026', 'Usa tu perfil'],
    ['staff-1', 'corta', 'corta', 'al menos 12'],
    ['staff-1', 'x'.repeat(129), 'x'.repeat(129), 'no puede superar'],
    ['staff-1', 'UnaClaveNueva#2026', 'OtraClaveNueva#2026', 'no coinciden'],
  ])('rechaza entradas inválidas sin tocar credenciales', async (userId, password, confirmation, message) => {
    const result = await resetStaffPasswordAction(userId, password, confirmation);

    expect(result.error).toContain(message);
    expect(mockResetCredential).not.toHaveBeenCalled();
  });

  it('no registra la contraseña en claro', async () => {
    const plaintext = 'NuncaDebeSalirEnLogs#2026';
    await resetStaffPasswordAction('staff-1', plaintext, plaintext);

    expect(JSON.stringify(mockLogRedacted.mock.calls)).not.toContain(plaintext);
    expect(mockLogRedacted).toHaveBeenCalledWith(
      'info',
      '[admin] Staff password reset',
      { actorUserId: 'admin-1', targetUserId: 'staff-1' },
    );
  });

  it('devuelve un mensaje neutro si el objetivo no es un usuario interno', async () => {
    mockResetCredential.mockRejectedValue(new MockStaffPasswordResetError('staff-user-not-found'));

    await expect(
      resetStaffPasswordAction('brand-1', 'UnaClaveNueva#2026', 'UnaClaveNueva#2026'),
    ).resolves.toEqual({ error: 'El usuario de equipo no existe' });
  });
});
