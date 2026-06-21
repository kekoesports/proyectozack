import type { Role } from '@/lib/auth-guard';
import { requireAnyRole } from '@/lib/auth-guard';

// ── Legacy helpers (kept for all existing call sites) ────────────────────────

export function canSeeAll(role: Role): boolean {
  return role === 'admin' || role === 'manager';
}

export function canDelete(role: Role): boolean {
  return role === 'admin';
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
  | 'bancos';

export type Action = 'read' | 'write' | 'publish' | 'delete' | 'manage_users';

type PermissionsMap = Record<Module, Partial<Record<Action, readonly Role[]>>>;

export const PERMISSIONS = {
  noticias: {
    read:    ['admin', 'manager', 'staff', 'editor', 'ops', 'talent_manager', 'analyst'],
    write:   ['admin', 'manager', 'editor'],
    publish: ['admin', 'manager', 'editor'],
    delete:  ['admin', 'manager'],
  },
  sorteos: {
    read:    ['admin', 'manager', 'staff', 'ops'],
    write:   ['admin', 'manager', 'ops'],
    publish: ['admin', 'manager'],
    delete:  ['admin', 'manager'],
  },
  codigos: {
    read:    ['admin', 'manager', 'staff', 'ops'],
    write:   ['admin', 'manager', 'ops'],
    delete:  ['admin', 'manager'],
  },
  talentos: {
    read:    ['admin', 'manager', 'staff', 'talent_manager'],
    write:   ['admin', 'manager', 'staff', 'talent_manager'],
    delete:  ['admin'],
  },
  campanas: {
    read:    ['admin', 'manager', 'staff', 'ops', 'talent_manager', 'finance'],
    write:   ['admin', 'manager', 'staff', 'ops'],
    delete:  ['admin'],
  },
  facturacion: {
    read:    ['admin', 'manager', 'finance'],
    write:   ['admin', 'manager', 'finance'],
    delete:  ['admin'],
  },
  analytics: {
    read:    ['admin', 'manager', 'analyst', 'finance', 'talent_manager'],
    write:   ['admin', 'manager'],
  },
  agenda: {
    read:    ['admin', 'manager', 'staff', 'ops', 'editor'],
    write:   ['admin', 'manager', 'ops', 'editor'],
    delete:  ['admin', 'manager'],
  },
  rankings: {
    read:    ['admin', 'manager', 'staff', 'editor', 'analyst'],
    write:   ['admin', 'manager', 'editor'],
    delete:  ['admin', 'manager'],
  },
  equipo: {
    read:    ['admin', 'manager', 'staff'],
    write:   ['admin', 'manager'],
    delete:  ['admin'],
  },
  ajustes: {
    read:    ['admin', 'manager'],
    write:   ['admin'],
    delete:  ['admin'],
  },
  tareas: {
    read:    ['admin', 'manager', 'staff', 'editor', 'ops', 'talent_manager'],
    write:   ['admin', 'manager', 'ops'],
    delete:  ['admin', 'manager'],
  },
  usuarios: {
    read:         ['admin'],
    write:        ['admin'],
    delete:       ['admin'],
    manage_users: ['admin'],
  },
  targets: {
    read:   ['admin', 'manager', 'staff'],
    write:  ['admin', 'manager', 'staff'],
    delete: ['admin'],
  },
  prensa_targets: {
    read:   ['admin', 'manager', 'staff'],
    write:  ['admin', 'manager', 'staff'],
    delete: ['admin', 'manager'],
  },
  dashboard: {
    read: ['admin', 'manager', 'staff'],
  },
  bancos: {
    read:   ['admin', 'manager', 'finance'],
    write:  ['admin', 'manager', 'finance'],
    delete: ['admin'],
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
