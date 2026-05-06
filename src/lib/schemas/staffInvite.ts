import { z } from 'zod';

export const STAFF_ROLES = ['admin', 'manager', 'staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const StaffInvite = z.object({
  name:  z.string().trim().min(2, 'Nombre demasiado corto').max(100),
  email: z.email({ message: 'Email no válido' }).max(200),
  role:  z.enum(STAFF_ROLES).default('staff'),
});

export type StaffInvite = z.infer<typeof StaffInvite>;
