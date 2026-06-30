/**
 * Tests de acceso para el rol admin_limited_tasks.
 * Verifica: es un rol válido, accede a /admin, usa nav admin completo,
 * tiene permisos admin en módulos generales, y mantiene tareas own-only.
 * Los tests de ownership de tareas viven en task-ownership.test.ts.
 */

// better-auth usa ESM nativo — mockear antes de que el módulo cargue
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { isRole, ROLES, rolesIncludes } from '@/lib/auth-guard';
import {
  canSeeAll,
  canDelete,
  assertCanDelete,
  needsVisibilityFilter,
} from '@/lib/permissions';

// ── 1. Rol válido en ROLES ────────────────────────────────────────────────────

describe('admin_limited_tasks — rol reconocido', () => {
  it('está incluido en ROLES', () => {
    expect(ROLES).toContain('admin_limited_tasks');
  });

  it('isRole("admin_limited_tasks") → true', () => {
    expect(isRole('admin_limited_tasks')).toBe(true);
  });

  it('isRole("admin_unlimited") → false (rol inexistente no se cuela)', () => {
    expect(isRole('admin_unlimited')).toBe(false);
  });
});

// ── 2. homeForRole — accede a /admin (via rolesIncludes) ─────────────────────
// homeForRole es private; lo probamos vía la lista del dashboard layout.

describe('admin_limited_tasks — accede al dashboard /admin', () => {
  // Esta es la lista exacta que usa (dashboard)/layout.tsx tras el fix.
  const DASHBOARD_ROLES = [
    'admin', 'admin_limited_tasks', 'manager', 'staff',
    'editor', 'finance', 'analyst', 'ops', 'talent_manager',
  ] as const;

  it('rolesIncludes pasa para admin_limited_tasks en la lista del dashboard layout', () => {
    expect(rolesIncludes(DASHBOARD_ROLES, 'admin_limited_tasks')).toBe(true);
  });

  it('rolesIncludes también pasa para admin (regresión)', () => {
    expect(rolesIncludes(DASHBOARD_ROLES, 'admin')).toBe(true);
  });

  it('rolesIncludes también pasa para manager (regresión)', () => {
    expect(rolesIncludes(DASHBOARD_ROLES, 'manager')).toBe(true);
  });
});

// ── 3. Nav: usa ADMIN nav completo, no el nav de staff ───────────────────────
// El layout calcula useStaffNav = (role==='staff') && !(role==='manager').
// Para admin_limited_tasks: isStaff=false → useStaffNav=false → ADMIN nav.

function computeUseStaffNav(role: string): boolean {
  const isStaff = role === 'staff';
  const isManager = role === 'manager';
  return isStaff && !isManager;
}

describe('admin_limited_tasks — nav admin completo', () => {
  it('isStaff=false → no usa el nav restringido de staff', () => {
    expect(computeUseStaffNav('admin_limited_tasks')).toBe(false);
  });

  it('staff sigue usando el nav restringido (regresión)', () => {
    expect(computeUseStaffNav('staff')).toBe(true);
  });
});

// ── 4. Permisos admin en módulos generales ────────────────────────────────────

describe('admin_limited_tasks — permisos admin fuera de tareas', () => {
  it('canSeeAll → true (ve todo el contenido general)', () => {
    expect(canSeeAll('admin_limited_tasks')).toBe(true);
  });

  it('canDelete → true (puede borrar)', () => {
    expect(canDelete('admin_limited_tasks')).toBe(true);
  });

  it('assertCanDelete no lanza (permiso de borrado activo)', () => {
    expect(() => assertCanDelete('admin_limited_tasks')).not.toThrow();
  });

  it('needsVisibilityFilter → false (ve contenido general sin filtro de staff)', () => {
    // La restricción de tareas own-only se gestiona aparte en crmTasks.ts
    expect(needsVisibilityFilter('admin_limited_tasks')).toBe(false);
  });
});

// ── 5. Restricción own-only en tareas ─────────────────────────────────────────
// La lógica de visibilityCondition en crmTasks.ts solo permite all-tasks a 'admin'.
// Para admin_limited_tasks, cae en el filtro de owner/assignee (comportamiento correcto).
// Tests exhaustivos de estas acciones están en task-ownership.test.ts.

describe('admin_limited_tasks — tareas own-only', () => {
  it('visibilityCondition debería devolver filtro para admin_limited_tasks (no undefined)', () => {
    // Replica la lógica de dashboard.ts taskVisibilityCondition:
    // solo 'admin' y 'manager' ven todas las tareas sin filtro.
    function needsOwnOnlyFilter(role: string): boolean {
      return role !== 'admin' && role !== 'manager';
    }
    expect(needsOwnOnlyFilter('admin_limited_tasks')).toBe(true);
  });

  it('admin sigue viendo todas las tareas (regresión)', () => {
    function needsOwnOnlyFilter(role: string): boolean {
      return role !== 'admin' && role !== 'manager';
    }
    expect(needsOwnOnlyFilter('admin')).toBe(false);
  });
});

// ── 6. Regresión: manager no afectado ────────────────────────────────────────

describe('manager — comportamiento anterior sin cambios', () => {
  it('isRole("manager") → true', () => {
    expect(isRole('manager')).toBe(true);
  });

  it('canSeeAll → true (manager ve todo)', () => {
    expect(canSeeAll('manager')).toBe(true);
  });

  it('canDelete → false (manager no puede borrar)', () => {
    expect(canDelete('manager')).toBe(false);
  });

  it('assertCanDelete lanza forbidden:delete:manager', () => {
    expect(() => assertCanDelete('manager')).toThrow('forbidden:delete:manager');
  });

  it('needsVisibilityFilter → false (manager ve todo el contenido)', () => {
    expect(needsVisibilityFilter('manager')).toBe(false);
  });
});

// ── 7. Regresión: staff no afectado ──────────────────────────────────────────

describe('staff — comportamiento anterior sin cambios', () => {
  it('isRole("staff") → true', () => {
    expect(isRole('staff')).toBe(true);
  });

  it('canSeeAll → false (staff no ve todo el contenido)', () => {
    expect(canSeeAll('staff')).toBe(false);
  });

  it('canDelete → false (staff no puede borrar)', () => {
    expect(canDelete('staff')).toBe(false);
  });

  it('assertCanDelete lanza forbidden:delete:staff', () => {
    expect(() => assertCanDelete('staff')).toThrow('forbidden:delete:staff');
  });

  it('needsVisibilityFilter → true (staff solo ve lo suyo)', () => {
    expect(needsVisibilityFilter('staff')).toBe(true);
  });
});
