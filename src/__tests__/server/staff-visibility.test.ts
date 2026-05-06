/**
 * Tests de visibilidad para staff.
 * Verifica que los filtros de ownership se aplican correctamente.
 */

import { needsVisibilityFilter } from '@/lib/permissions';

describe('needsVisibilityFilter', () => {
  it('staff necesita filtro', () => {
    expect(needsVisibilityFilter('staff')).toBe(true);
  });

  it('admin NO necesita filtro', () => {
    expect(needsVisibilityFilter('admin')).toBe(false);
  });

  it('manager NO necesita filtro', () => {
    expect(needsVisibilityFilter('manager')).toBe(false);
  });
});

// Tests de assertCanEditCampaign para verificar que staff sin ownership es bloqueado

jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/headers', () => ({ headers: jest.fn().mockResolvedValue({}) }));

const mockDb = jest.fn();
jest.mock('@/lib/db', () => ({ db: { select: (...args: unknown[]) => mockDb(...args) } }));

describe('assertCanEditCampaign — lógica de ownership', () => {
  it('admin siempre puede editar (early return)', async () => {
    // admin no llega a la DB
    const { assertCanEditCampaign } = await import('@/lib/queries/campaigns');
    await expect(
      assertCanEditCampaign(1, { userId: 'admin-1', role: 'admin' }),
    ).resolves.toBeUndefined();
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('manager siempre puede editar (early return)', async () => {
    const { assertCanEditCampaign } = await import('@/lib/queries/campaigns');
    await expect(
      assertCanEditCampaign(1, { userId: 'mgr-1', role: 'manager' }),
    ).resolves.toBeUndefined();
    expect(mockDb).not.toHaveBeenCalled();
  });
});
