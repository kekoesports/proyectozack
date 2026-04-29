import { asc, inArray } from 'drizzle-orm';

import { user } from '@/db/schema';
import { db } from '@/lib/db';

export type StaffUserRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string | null;
};

/**
 * Usuarios internos (admin/manager/staff) que pueden ser owner o assignee de tareas CRM.
 * Ordenados por nombre.
 *
 * @cache none
 * @visibility admin
 * @returns array de `StaffUserRow` (id, name, email, role).
 */
export async function getAllStaffUsers(): Promise<readonly StaffUserRow[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(inArray(user.role, ['admin', 'manager', 'staff']))
    .orderBy(asc(user.name));
}

