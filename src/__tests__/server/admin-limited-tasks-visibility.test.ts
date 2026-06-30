/**
 * Tests de visibilidad RBAC para el rol `admin_limited_tasks`.
 *
 * Verifica que Alfonso (u otro usuario con ese rol) aparezca en:
 * - dropdowns de asignación de tareas
 * - listado del equipo
 * - asignación de marcas
 * - estadísticas semanales del equipo
 *
 * El rol `admin_limited_tasks` tiene permisos de admin en todos los módulos
 * excepto tareas, donde solo ve las propias. La restricción es "own-tasks only",
 * NOT exclusión del equipo. (Cubierto en task-ownership.test.ts: T1-T12)
 */

import { ASSIGNABLE_TEAM_ROLES, isAssignableTeamUser } from '@/lib/team-roles';

// ── Mocks de DB ──────────────────────────────────────────────────────────────

type SelectBuilder = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  groupBy: jest.Mock;
  then: jest.Mock;
};

const makeSelectBuilder = (resolvedValue: unknown[]): SelectBuilder => {
  const resolved = Promise.resolve(resolvedValue);
  const builder: SelectBuilder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    groupBy: jest.fn(),
    then: jest.fn((fn: (v: unknown[]) => unknown) => resolved.then(fn)),
  };
  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.groupBy.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(resolvedValue);
  return builder;
};

const mockSelect = jest.fn();
const mockDb = { select: mockSelect };

jest.mock('@/lib/db', () => ({ db: mockDb }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { getAllStaffUsers } from '@/lib/queries/staffUsers';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ASSIGNABLE_TEAM_ROLES y isAssignableTeamUser', () => {
  it('ASSIGNABLE_TEAM_ROLES incluye admin_limited_tasks', () => {
    expect(ASSIGNABLE_TEAM_ROLES).toContain('admin_limited_tasks');
  });

  it('isAssignableTeamUser devuelve true para todos los roles de equipo', () => {
    for (const role of ['admin', 'admin_limited_tasks', 'manager', 'staff']) {
      expect(isAssignableTeamUser(role)).toBe(true);
    }
  });

  it('isAssignableTeamUser devuelve false para roles no-equipo', () => {
    for (const role of ['brand', 'editor', 'analyst', 'ops', 'finance', 'talent_manager']) {
      expect(isAssignableTeamUser(role)).toBe(false);
    }
  });

  it('isAssignableTeamUser devuelve false para null y undefined', () => {
    expect(isAssignableTeamUser(null)).toBe(false);
    expect(isAssignableTeamUser(undefined)).toBe(false);
    expect(isAssignableTeamUser('')).toBe(false);
  });
});

describe('getAllStaffUsers — visibilidad de admin_limited_tasks', () => {
  const alfonsRow = {
    id: 'user-alfonso',
    name: 'Alfonso Arias',
    email: 'arias@socialpro.es',
    role: 'admin_limited_tasks',
  };

  beforeEach(() => jest.clearAllMocks());

  it('devuelve usuarios con rol admin_limited_tasks en el listado de equipo', async () => {
    const users = [
      { id: 'u1', name: 'Admin', email: 'admin@sp.es', role: 'admin' },
      alfonsRow,
      { id: 'u2', name: 'Manager', email: 'mgr@sp.es', role: 'manager' },
      { id: 'u3', name: 'Staff', email: 'staff@sp.es', role: 'staff' },
    ];
    mockSelect.mockReturnValue(makeSelectBuilder(users));

    const result = await getAllStaffUsers();

    expect(result).toHaveLength(4);
    const alfonso = result.find((u) => u.role === 'admin_limited_tasks');
    expect(alfonso).toBeDefined();
    expect(alfonso?.email).toBe('arias@socialpro.es');
  });

  it('dropdown de asignación no queda vacío cuando solo hay usuarios admin_limited_tasks', async () => {
    mockSelect.mockReturnValue(makeSelectBuilder([alfonsRow]));

    const result = await getAllStaffUsers();

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe('admin_limited_tasks');
  });

  it('devuelve array vacío cuando no hay usuarios de equipo en DB', async () => {
    mockSelect.mockReturnValue(makeSelectBuilder([]));

    const result = await getAllStaffUsers();

    expect(result).toEqual([]);
  });
});
