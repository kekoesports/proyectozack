import { asc, inArray } from 'drizzle-orm';

import { user } from '@/db/schema';
import { db } from '@/lib/db';

export type StaffUserRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string | null;
};

/** Internal users that can own or receive CRM tasks. */
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

export async function getFirstAdminUserId(): Promise<string | undefined> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.role, ['admin']))
    .orderBy(asc(user.name))
    .limit(1);

  return row?.id;
}
