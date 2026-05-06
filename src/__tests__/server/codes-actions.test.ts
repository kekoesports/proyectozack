/**
 * Tests para giveaways/codes-actions.
 *
 * Nota: la validación de allowlist (validateRedirectField) fue eliminada porque
 * createCodeAction es admin-only — no hay riesgo de open-redirect desde un form de admin.
 * Los tests de esquemas inválidos (javascript:, data:, URL relativa) siguen vigentes
 * porque los bloquea Zod z.url() antes de llegar a la DB.
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next/headers', () => ({ headers: jest.fn().mockResolvedValue({}) }));

const mockRequireRole = jest.fn();
const mockRequireAnyRole = jest.fn();
jest.mock('@/lib/auth-guard', () => ({
  requireRole:    (...args: unknown[]) => mockRequireRole(...args),
  requireAnyRole: (...args: unknown[]) => mockRequireAnyRole(...args),
}));

const mockCreateCode = jest.fn();
const mockDeleteCode = jest.fn();
const mockUpdateCode = jest.fn();
jest.mock('@/lib/queries/creatorCodes', () => ({
  createCode: (...args: unknown[]) => mockCreateCode(...args),
  deleteCode: (...args: unknown[]) => mockDeleteCode(...args),
  updateCode: (...args: unknown[]) => mockUpdateCode(...args),
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
  redirectUrl: 'https://example.com/PROMO',
  brandLogo: '',
  description: '',
  badge: '',
  category: '',
  ctaText: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireRole.mockResolvedValue({ user: { role: 'admin' } });
  mockRequireAnyRole.mockResolvedValue({ user: { role: 'admin' } });
});

describe('createCodeAction redirectUrl validation', () => {
  it('acepta cualquier URL https válida — sin restricción de dominio para admins', async () => {
    mockCreateCode.mockResolvedValue(undefined);
    const result = await createCodeAction(makeFormData(baseFields));
    expect(result).toEqual({ ok: true });
    expect(mockCreateCode).toHaveBeenCalledTimes(1);
  });

  it('acepta URL de cualquier dominio externo (allowlist eliminada para admin forms)', async () => {
    mockCreateCode.mockResolvedValue(undefined);
    const fd = makeFormData({ ...baseFields, redirectUrl: 'https://attacker.com/foo' });
    const result = await createCodeAction(fd);
    expect(result).toEqual({ ok: true });
    expect(mockCreateCode).toHaveBeenCalledTimes(1);
  });

  it('rechaza javascript: scheme (Zod url() lo bloquea)', async () => {
    const fd = makeFormData({ ...baseFields, redirectUrl: 'javascript:alert(1)' });
    const result = await createCodeAction(fd);
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('redirectUrl');
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('rechaza URL relativa (Zod url() la bloquea)', async () => {
    const fd = makeFormData({ ...baseFields, redirectUrl: '/dashboard' });
    const result = await createCodeAction(fd);
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('redirectUrl');
    expect(mockCreateCode).not.toHaveBeenCalled();
  });

  it('rechaza data: scheme (Zod url() lo bloquea)', async () => {
    const fd = makeFormData({ ...baseFields, redirectUrl: 'data:text/html,<script>alert(1)</script>' });
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

  it('retorna fieldErrors cuando falta brandName', async () => {
    const fd = makeFormData({ ...baseFields, brandName: '' });
    const result = await createCodeAction(fd);
    if (result.ok) throw new Error('expected failure');
    expect(result.fieldErrors).toHaveProperty('brandName');
    expect(mockCreateCode).not.toHaveBeenCalled();
  });
});
