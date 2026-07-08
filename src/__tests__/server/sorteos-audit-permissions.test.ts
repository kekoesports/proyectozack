/**
 * Sorteos Fase 1 PR2 — permiso `sorteos:audit`.
 *
 * La vista `/admin/giveaways/auditoria` requiere `sorteos:audit`, distinto
 * de `sorteos:read`. La razón: la vista puede contener metadata,
 * userAgent, ipHash y trazas de otros usuarios. Solo roles con permiso
 * explícito lo ven.
 */

// permissions.ts importa @/lib/auth-guard → @/lib/auth → better-auth (ESM),
// que no carga bajo Jest. Mockeamos auth-guard antes del import de permissions.
jest.mock('@/lib/auth-guard', () => ({
  requireAnyRole: jest.fn(),
}));
jest.mock('@/lib/team-roles', () => ({
  ASSIGNABLE_TEAM_ROLES: [],
  isAssignableTeamUser: () => false,
}));

import { PERMISSIONS } from '@/lib/permissions';

describe('PERMISSIONS.sorteos.audit', () => {
  it('está definido en el mapa', () => {
    const scope = PERMISSIONS.sorteos as { audit?: readonly string[] };
    expect(scope.audit).toBeDefined();
    expect(Array.isArray(scope.audit)).toBe(true);
  });

  it('incluye admin, admin_limited_tasks, manager', () => {
    const audit = (PERMISSIONS.sorteos as { audit?: readonly string[] }).audit ?? [];
    expect(audit).toEqual(expect.arrayContaining(['admin', 'admin_limited_tasks', 'manager']));
  });

  it('excluye staff y ops explícitamente', () => {
    const audit = (PERMISSIONS.sorteos as { audit?: readonly string[] }).audit ?? [];
    expect(audit).not.toContain('staff');
    expect(audit).not.toContain('ops');
  });

  it('excluye roles brand/creator/editor/talent_manager/finance/analyst', () => {
    const audit = (PERMISSIONS.sorteos as { audit?: readonly string[] }).audit ?? [];
    for (const excluded of ['brand', 'creator', 'editor', 'talent_manager', 'finance', 'analyst']) {
      expect(audit).not.toContain(excluded);
    }
  });

  it('no expone strings sensibles como valor', () => {
    const audit = (PERMISSIONS.sorteos as { audit?: readonly string[] }).audit ?? [];
    for (const role of audit) {
      expect(typeof role).toBe('string');
      expect(role.length).toBeLessThan(50);
    }
  });

  it('sorteos:read sigue permitiendo staff/ops (regresión)', () => {
    const read = PERMISSIONS.sorteos.read ?? [];
    expect(read).toContain('staff');
    expect(read).toContain('ops');
  });
});
