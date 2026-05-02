import { z } from 'zod';

export const StaffInvite = z.object({
  name: z.string().trim().min(2, 'Nombre demasiado corto').max(100),
  email: z.email({ message: 'Email no válido' }).max(200),
});

export type StaffInvite = z.infer<typeof StaffInvite>;
