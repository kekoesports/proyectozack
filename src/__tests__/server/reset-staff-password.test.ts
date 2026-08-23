jest.mock('server-only', () => ({}));

const mockHashPassword = jest.fn();
jest.mock('better-auth/crypto', () => ({
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}));

jest.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ and: args }),
  eq: (...args: unknown[]) => ({ eq: args }),
  inArray: (...args: unknown[]) => ({ inArray: args }),
}));

jest.mock('@/db/schema', () => ({
  account: {
    id: 'account.id',
    userId: 'account.userId',
    providerId: 'account.providerId',
  },
  session: { userId: 'session.userId' },
  user: { id: 'user.id', role: 'user.role' },
}));

const mockTargetLimit = jest.fn();
const mockCredentialLimit = jest.fn();
const mockUpdateWhere = jest.fn();
const mockInsertValues = jest.fn();
const mockDeleteWhere = jest.fn();

const tx = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({ limit: mockCredentialLimit })),
    })),
  })),
  update: jest.fn(() => ({
    set: jest.fn(() => ({ where: mockUpdateWhere })),
  })),
  insert: jest.fn(() => ({ values: mockInsertValues })),
  delete: jest.fn(() => ({ where: mockDeleteWhere })),
};

const mockDb = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({ limit: mockTargetLimit })),
    })),
  })),
  transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
};

jest.mock('@/lib/db', () => ({ db: mockDb }));

import {
  resetStaffPasswordCredential,
  StaffPasswordResetError,
} from '@/lib/auth/resetStaffPassword';

beforeEach(() => {
  jest.clearAllMocks();
  mockTargetLimit.mockResolvedValue([{ id: 'staff-1' }]);
  mockCredentialLimit.mockResolvedValue([{ id: 'credential-1' }]);
  mockHashPassword.mockResolvedValue('hashed-password');
});

describe('resetStaffPasswordCredential', () => {
  it('rechaza objetivos que no sean miembros del equipo', async () => {
    mockTargetLimit.mockResolvedValue([]);

    await expect(
      resetStaffPasswordCredential({ userId: 'brand-1', newPassword: 'UnaClaveNueva#2026' }),
    ).rejects.toBeInstanceOf(StaffPasswordResetError);

    expect(mockHashPassword).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('hashea, sustituye la credencial y revoca todas las sesiones', async () => {
    await resetStaffPasswordCredential({
      userId: 'staff-1',
      newPassword: 'UnaClaveNueva#2026',
    });

    expect(mockHashPassword).toHaveBeenCalledWith('UnaClaveNueva#2026');
    expect(tx.update).toHaveBeenCalled();
    expect(mockUpdateWhere).toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(tx.delete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it('crea una credencial local si el usuario solo tenía otro proveedor', async () => {
    mockCredentialLimit.mockResolvedValue([]);

    await resetStaffPasswordCredential({
      userId: 'staff-1',
      newPassword: 'UnaClaveNueva#2026',
    });

    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'staff-1',
      providerId: 'credential',
      userId: 'staff-1',
      password: 'hashed-password',
    }));
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});
