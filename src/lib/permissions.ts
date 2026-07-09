import type { Role } from '@/lib/auth-guard';
import { requireAnyRole } from '@/lib/auth-guard';
import { ASSIGNABLE_TEAM_ROLES, isAssignableTeamUser } from '@/lib/team-roles';

export { ASSIGNABLE_TEAM_ROLES, isAssignableTeamUser };

// ── Legacy helpers (kept for all existing call sites) ────────────────────────

export function canSeeAll(role: Role): boolean {
  return role === 'admin' || role === 'manager' || role === 'admin_limited_tasks';
}

export function canDelete(role: Role): boolean {
  return role === 'admin' || role === 'admin_limited_tasks';
}

export function assertCanDelete(role: Role): void {
  if (!canDelete(role)) {
    throw new Error('forbidden:delete:' + role);
  }
}

export type VisibilityArgs = {
  readonly assignedToCol: unknown;
  readonly createdByCol: unknown;
  readonly userId: string;
  readonly role: Role;
};

export function needsVisibilityFilter(role: Role): boolean {
  return role === 'staff';
}

// ── RBAC permission map ──────────────────────────────────────────────────────

export type Module =
  | 'noticias'
  | 'sorteos'
  | 'codigos'
  | 'talentos'
  | 'campanas'
  | 'facturacion'
  | 'analytics'
  | 'agenda'
  | 'rankings'
  | 'equipo'
  | 'tareas'
  | 'ajustes'
  | 'usuarios'
  | 'targets'
  | 'prensa_targets'
  | 'dashboard'
  | 'bancos'
  | 'contratos'
  | 'contabilidad';

export type Action = 'read' | 'write' | 'publish' | 'delete' | 'manage_users' | 'audit';

type PermissionsMap = Record<Module, Partial<Record<Action, readonly Role[]>>>;

export const PERMISSIONS = {
  noticias: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'editor', 'ops', 'talent_manager', 'analyst'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'editor'],
    publish: ['admin', 'admin_limited_tasks', 'manager', 'editor'],
    delete:  ['admin', 'admin_limited_tasks', 'manager'],
  },
  sorteos: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'ops'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'ops'],
    publish: ['admin', 'admin_limited_tasks', 'manager'],
    delete:  ['admin', 'admin_limited_tasks', 'manager'],
    audit:   ['admin', 'admin_limited_tasks', 'manager'],
  },
  codigos: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'ops'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'ops'],
    delete:  ['admin', 'admin_limited_tasks', 'manager'],
  },
  talentos: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'talent_manager'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'staff', 'talent_manager'],
    delete:  ['admin', 'admin_limited_tasks'],
  },
  campanas: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'ops', 'talent_manager', 'finance'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'staff', 'ops'],
    delete:  ['admin', 'admin_limited_tasks'],
  },
  facturacion: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'finance'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'finance'],
    delete:  ['admin', 'admin_limited_tasks'],
  },
  analytics: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'analyst', 'finance', 'talent_manager'],
    write:   ['admin', 'admin_limited_tasks', 'manager'],
  },
  agenda: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'ops', 'editor'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'ops', 'editor'],
    delete:  ['admin', 'admin_limited_tasks', 'manager'],
  },
  rankings: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'editor', 'analyst'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'editor'],
    delete:  ['admin', 'admin_limited_tasks', 'manager'],
  },
  equipo: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff'],
    write:   ['admin', 'admin_limited_tasks', 'manager'],
    delete:  ['admin', 'admin_limited_tasks'],
  },
  ajustes: {
    read:    ['admin', 'admin_limited_tasks', 'manager'],
    write:   ['admin', 'admin_limited_tasks'],
    delete:  ['admin', 'admin_limited_tasks'],
  },
  tareas: {
    read:    ['admin', 'admin_limited_tasks', 'manager', 'staff', 'editor', 'ops', 'talent_manager'],
    write:   ['admin', 'admin_limited_tasks', 'manager', 'ops'],
    delete:  ['admin', 'admin_limited_tasks', 'manager'],
  },
  usuarios: {
    read:         ['admin', 'admin_limited_tasks'],
    write:        ['admin', 'admin_limited_tasks'],
    delete:       ['admin', 'admin_limited_tasks'],
    manage_users: ['admin', 'admin_limited_tasks'],
  },
  targets: {
    read:   ['admin', 'admin_limited_tasks', 'manager', 'staff'],
    write:  ['admin', 'admin_limited_tasks', 'manager', 'staff'],
    delete: ['admin', 'admin_limited_tasks'],
  },
  prensa_targets: {
    read:   ['admin', 'admin_limited_tasks', 'manager', 'staff'],
    write:  ['admin', 'admin_limited_tasks', 'manager', 'staff'],
    delete: ['admin', 'admin_limited_tasks', 'manager'],
  },
  dashboard: {
    read: ['admin', 'admin_limited_tasks', 'manager', 'staff'],
  },
  bancos: {
    read:   ['admin', 'admin_limited_tasks', 'manager', 'finance'],
    write:  ['admin', 'admin_limited_tasks', 'manager', 'finance'],
    delete: ['admin', 'admin_limited_tasks'],
  },
  contratos: {
    read:   ['admin', 'admin_limited_tasks', 'manager', 'finance', 'ops'],
    write:  ['admin', 'admin_limited_tasks', 'manager', 'ops'],
    delete: ['admin', 'admin_limited_tasks'],
  },
  // Contabilidad (Libro Mayor) — vista read-only con fixture sintético en PR 1.
  // Deliberadamente MÁS restrictivo que facturacion — solo admin real.
  // No incluir finance/manager/staff/ops sin decisión explícita.
  contabilidad: {
    read: ['admin', 'admin_limited_tasks'],
  },
} as const satisfies PermissionsMap;

// ── requirePermission ────────────────────────────────────────────────────────

/**
 * New primitive for permission-based guards.
 * Phase 2+ will migrate existing requireAnyRole() call sites to this.
 * Phase 1: additive only — existing call sites are unchanged.
 */
export async function requirePermission(
  module: Module,
  action: Action,
  loginPath = '/admin/login',
) {
  // safe: PermissionsMap guarantees values are Partial<Record<Action, readonly Role[]>>
  const modulePerms = PERMISSIONS[module] as Partial<Record<Action, readonly Role[]>>;
  const allowedRoles = modulePerms[action];
  if (!allowedRoles || allowedRoles.length === 0) {
    throw new Error(`forbidden:${module}:${action}`);
  }
  return requireAnyRole(allowedRoles, loginPath);
}
