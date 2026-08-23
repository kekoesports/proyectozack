import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

import { account, session, user } from '@/db/schema';
import { db } from '@/lib/db';
import { STAFF_ROLES } from '@/lib/schemas/staffInvite';

export class StaffPasswordResetError extends Error {}

/**
 * Sustituye la credencial local de un miembro del equipo y revoca sus sesiones.
 *
 * La autorización vive en la Server Action; este helper vuelve a limitar el
 * objetivo a roles internos para que nunca pueda reutilizarse contra clientes
 * `brand` u otras cuentas externas.
 */
export async function resetStaffPasswordCredential(input: {
  readonly userId: string;
  readonly newPassword: string;
}): Promise<void> {
  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(
      eq(user.id, input.userId),
      inArray(user.role, [...STAFF_ROLES]),
    ))
    .limit(1);

  if (!target) throw new StaffPasswordResetError('staff-user-not-found');

  // Better Auth usa exactamente este hasher para email/password. La contraseña
  // en claro no se persiste, no se devuelve y no debe aparecer en logs.
  const passwordHash = await hashPassword(input.newPassword);
  const now = new Date();

  await db.transaction(async (tx) => {
    const [credential] = await tx
      .select({ id: account.id })
      .from(account)
      .where(and(
        eq(account.userId, input.userId),
        eq(account.providerId, 'credential'),
      ))
      .limit(1);

    if (credential) {
      await tx
        .update(account)
        .set({ password: passwordHash, updatedAt: now })
        .where(eq(account.id, credential.id));
    } else {
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: input.userId,
        providerId: 'credential',
        userId: input.userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Una contraseña sustituida implica que las sesiones anteriores dejan de
    // ser confiables. El usuario deberá iniciar sesión con la nueva.
    await tx.delete(session).where(eq(session.userId, input.userId));
  });
}
