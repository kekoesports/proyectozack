import type { Role } from '@/lib/auth-guard';

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

// visibilityFilter: retorna condición SQL para filtrar por ownership
// admin/manager → undefined (sin filtro, ven todo)
// staff → necesita filtrar por assignedToUserId OR createdByUserId
// El caller aplica el filtro en la query Drizzle
export type VisibilityArgs = {
  readonly assignedToCol: unknown; // columna Drizzle de assigned_to_user_id
  readonly createdByCol: unknown;  // columna Drizzle de created_by_user_id
  readonly userId: string;
  readonly role: Role;
};

// Retorna true si el rol necesita filtro de visibilidad (staff).
// Las queries en crmBrands.ts construirán el or(eq(col, userId), eq(col2, userId))
// cuando needsVisibilityFilter retorne true.
export function needsVisibilityFilter(role: Role): boolean {
  return role === 'staff';
}
