/**
 * Smoke tests para giveaways/winners-actions.
 * Verifica que los permisos y la validación básica funcionan.
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next/headers', () => ({ headers: jest.fn().mockResolvedValue({}) }));

const mockRequireAnyRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: (...args: unknown[]) => mockRequireAnyRole(...args),
}));

const mockCreateWinner = jest.fn();
const mockDeleteWinner = jest.fn();
jest.mock('@/lib/queries/giveawayWinners', () => ({
  createWinner: (...args: unknown[]) => mockCreateWinner(...args),
  deleteWinner: (...args: unknown[]) => mockDeleteWinner(...args),
}));

import {
  createWinnerAction,
  deleteWinnerAction,
} from '@/app/admin/(dashboard)/giveaways/winners-actions';

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAnyRole.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
});

describe('createWinnerAction', () => {
  it('acepta manager — requireAnyRole([admin,manager])', async () => {
    mockCreateWinner.mockResolvedValue(undefined);
    const result = await createWinnerAction(
      fd({ giveawayId: '1', winnerName: 'Pepito', winnerAvatar: '' }),
    );
    expect(result).toEqual({ ok: true });
    expect(mockCreateWinner).toHaveBeenCalledTimes(1);
  });

  it('devuelve fieldErrors si falta winnerName', async () => {
    const result = await createWinnerAction(
      fd({ giveawayId: '1', winnerName: '', winnerAvatar: '' }),
    );
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('winnerName');
    expect(mockCreateWinner).not.toHaveBeenCalled();
  });

  it('devuelve fieldErrors si falta giveawayId', async () => {
    const result = await createWinnerAction(
      fd({ giveawayId: '', winnerName: 'Pepito', winnerAvatar: '' }),
    );
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('giveawayId');
    expect(mockCreateWinner).not.toHaveBeenCalled();
  });
});

describe('deleteWinnerAction', () => {
  it('elimina con id válido', async () => {
    mockDeleteWinner.mockResolvedValue(undefined);
    await deleteWinnerAction(fd({ id: '42' }));
    expect(mockDeleteWinner).toHaveBeenCalledWith(42);
  });

  it('no llama deleteWinner si id inválido', async () => {
    await deleteWinnerAction(fd({ id: 'abc' }));
    expect(mockDeleteWinner).not.toHaveBeenCalled();
  });
});
