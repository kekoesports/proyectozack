/**
 * Tests adversariales para giveaways/codes-actions.
 *
 * Cubre que `assertSafeRedirect` rechaza URLs maliciosas antes de persistir
 * y que el resultado expone `fieldErrors.redirectUrl` al UI.
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next/headers', () => ({ headers: jest.fn().mockResolvedValue({}) }));

const mockRequireRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

const mockCreateCode = jest.fn();
const mockDeleteCode = jest.fn();
jest.mock('@/lib/queries/creatorCodes', () => ({
  createCode: (...args: unknown[]) => mockCreateCode(...args),
  deleteCode: (...args: unknown[]) => mockDeleteCode(...args),
}));

jest.mock('@/lib/security/allowed-redirect-hosts', () => ({
  ALLOWED_REDIRECT_HOSTS: ['socialpro.test', 'p.skin.place'],
}));

import { createCodeAction } from '@/app/admin/(dashboard)/giveaways/codes-actions';

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const baseFields: Record<string, string> = {
  talentId: '1',
  code: 'PROMO',
  brandName: 'Brand X',
  redirectUrl: 'https://p.skin.place/PROMO',
  brandLogo: '',
  description: '',
  badge: '',
  category: '',
  ctaText: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireRole.mockResolvedValue({ user: { role: 'admin' } });
});

describe('createCodeAction redirectUrl validation', () => {
  it('acepta URL en allowlist', async () => {
    mockCreateCode.mockResolvedValue(undefined);
    const result = await createCodeAction(makeFormData(baseFields));
    expect(result).toEqual({ ok: true });
    expect(mockCreateCode).toHaveBeenCalledTimes(1);
  });

  it('rechaza userinfo embed (https://attacker.com@trusted.com)', async () => {
    const fd = makeFormData({
      ...baseFields,
      redirectUrl: 'https://attacker.com@p.skin.place/foo',
    });
    const result = await createCodeAction(fd);
    expect(result).toEqual({ ok: false, fieldErrors: { redirectUrl: ['URL no permitida'] } });
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('rechaza javascript: scheme (Zod url() bloquea antes de assertSafeRedirect)', async () => {
    const fd = makeFormData({
      ...baseFields,
      redirectUrl: 'javascript:alert(1)',
    });
    const result = await createCodeAction(fd);
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('redirectUrl');
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('rechaza host fuera de allowlist', async () => {
    const fd = makeFormData({
      ...baseFields,
      redirectUrl: 'https://attacker.com/foo',
    });
    const result = await createCodeAction(fd);
    expect(result).toEqual({ ok: false, fieldErrors: { redirectUrl: ['URL no permitida'] } });
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('rechaza URL relativa (Zod url() la bloquea)', async () => {
    const fd = makeFormData({
      ...baseFields,
      redirectUrl: '/dashboard',
    });
    const result = await createCodeAction(fd);
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('redirectUrl');
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('rechaza host en allowlist con masquerade prefix (p.skin.place.evil.com)', async () => {
    const fd = makeFormData({
      ...baseFields,
      redirectUrl: 'https://p.skin.place.evil.com/foo',
    });
    const result = await createCodeAction(fd);
    expect(result).toEqual({ ok: false, fieldErrors: { redirectUrl: ['URL no permitida'] } });
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('acepta port no estándar para host en allowlist', async () => {
    mockCreateCode.mockResolvedValue(undefined);
    const fd = makeFormData({
      ...baseFields,
      redirectUrl: 'https://p.skin.place:9443/foo',
    });
    const result = await createCodeAction(fd);
    expect(result).toEqual({ ok: true });
    expect(mockCreateCode).toHaveBeenCalledTimes(1);
  });

  it('rechaza data: scheme', async () => {
    const fd = makeFormData({
      ...baseFields,
      redirectUrl: 'data:text/html,<script>alert(1)</script>',
    });
    const result = await createCodeAction(fd);
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('redirectUrl');
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('retorna fieldErrors estructurados cuando falta talentId', async () => {
    const fd = makeFormData({ ...baseFields, talentId: '' });
    const result = await createCodeAction(fd);
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('talentId');
    expect(mockCreateCode).not.toHaveBeenCalled();
  });
});
