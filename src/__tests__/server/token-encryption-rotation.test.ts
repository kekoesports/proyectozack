const mockEnv: {
  TOKEN_ENCRYPTION_KEY?: string;
  TOKEN_ENCRYPTION_KEY_NEXT?: string;
} = {};

jest.mock('@/lib/env', () => ({ env: mockEnv }));

import {
  decrypt,
  encrypt,
  isTokenEncryptionRotationConfigured,
  rotateEncryptedToken,
  TokenEncryptionError,
} from '@/lib/crypto/token-encryption';

const CURRENT = '11'.repeat(32);
const NEXT = '22'.repeat(32);

describe('controlled token encryption rotation', () => {
  beforeEach(() => {
    mockEnv.TOKEN_ENCRYPTION_KEY = CURRENT;
    delete mockEnv.TOKEN_ENCRYPTION_KEY_NEXT;
  });

  it('mantiene lectura de tokens actuales y escribe con NEXT al activarla', () => {
    const oldToken = encrypt('old-secret');
    mockEnv.TOKEN_ENCRYPTION_KEY_NEXT = NEXT;
    const newToken = encrypt('new-secret');

    expect(decrypt(oldToken)).toBe('old-secret');
    expect(decrypt(newToken)).toBe('new-secret');
  });

  it('rota una sola vez y verifica el resultado', () => {
    const oldToken = encrypt('rotate-me');
    mockEnv.TOKEN_ENCRYPTION_KEY_NEXT = NEXT;

    const first = rotateEncryptedToken(oldToken);
    const second = rotateEncryptedToken(first.token);

    expect(first.changed).toBe(true);
    expect(second).toEqual({ token: first.token, changed: false });
    expect(decrypt(first.token)).toBe('rotate-me');
  });

  it('rechaza una falsa rotación con la misma clave', () => {
    const token = encrypt('same-key');
    mockEnv.TOKEN_ENCRYPTION_KEY_NEXT = CURRENT;

    expect(isTokenEncryptionRotationConfigured()).toBe(false);
    expect(() => rotateEncryptedToken(token)).toThrow(TokenEncryptionError);
  });
});
