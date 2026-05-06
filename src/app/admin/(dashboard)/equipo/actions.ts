'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { user as userTable } from '@/db/schema';
import { sendStaffInviteEmail } from '@/lib/email';
import { absoluteUrl } from '@/lib/site-url';
import { auth } from '@/lib/auth';
import { requireRole } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { StaffInvite, STAFF_ROLES } from '@/lib/schemas/staffInvite';

type ActionResult = { readonly error?: string };

type InviteState = {
  error?: string;
  success?: boolean;
};

function revalidateEquipo(): void {
  revalidatePath('/admin/equipo');
}

export async function inviteStaffAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  await requireRole('admin', '/admin/login');

  const parsed = parseFormData(formData, StaffInvite);
  if (!parsed.ok) return { error: firstError(parsed.fieldErrors) };
  const { name, email, role } = parsed.data;

  const existing = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email));
  if (existing.length > 0) return { error: 'Este email ya está registrado' };

  const tempPassword = crypto.randomUUID();

  try {
    await auth.api.signUpEmail({
      body: { name, email, password: tempPassword },
    });

    await db.update(userTable).set({ role }).where(eq(userTable.email, email));

    const loginUrl = absoluteUrl('/admin/login');
    try {
      await sendStaffInviteEmail({ staffEmail: email, staffName: name, loginUrl });
    } catch (err) {
      logRedacted('error', '[admin] Staff invite email error:', err);
    }
  } catch (err) {
    logRedacted('error', '[admin] Staff creation error:', err);
    return { error: 'Error al crear la cuenta' };
  }

  revalidateEquipo();
  return { success: true };
}

export async function updateUserRoleAction(
  userId: unknown,
  role: unknown,
): Promise<ActionResult> {
  const session = await requireRole('admin', '/admin/login');

  if (typeof userId !== 'string' || !userId) return { error: 'ID inválido' };

  const validRole = typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role)
    ? (role as typeof STAFF_ROLES[number])
    : null;
  if (!validRole) return { error: 'Rol inválido' };

  if (userId === session.user.id && validRole !== 'admin') {
    return { error: 'No puedes quitarte el rol admin a ti mismo' };
  }

  await db.update(userTable).set({ role: validRole }).where(eq(userTable.id, userId));
  revalidateEquipo();
  return {};
}

export async function removeUserAction(userId: unknown): Promise<ActionResult> {
  const session = await requireRole('admin', '/admin/login');

  if (typeof userId !== 'string' || !userId) return { error: 'ID inválido' };

  if (userId === session.user.id) {
    return { error: 'No puedes eliminarte a ti mismo' };
  }

  await db.delete(userTable).where(eq(userTable.id, userId));

  revalidateEquipo();
  return {};
}
