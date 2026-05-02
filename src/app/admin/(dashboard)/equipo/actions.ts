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
import { logRedacted } from '@/lib/log';
import { StaffInvite } from '@/lib/schemas/staffInvite';

type InviteState = {
  error?: string;
  success?: boolean;
};

function firstError(fieldErrors: Record<string, string[]>): string {
  for (const errs of Object.values(fieldErrors)) {
    const first = errs[0];
    if (first) return first;
  }
  return 'Datos inválidos';
}

export async function inviteStaffAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  await requireRole('admin', '/admin/login');

  const parsed = parseFormData(formData, StaffInvite);
  if (!parsed.ok) return { error: firstError(parsed.fieldErrors) };
  const { name, email } = parsed.data;

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

    await db.update(userTable).set({ role: 'staff' }).where(eq(userTable.email, email));

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

  revalidatePath('/admin/equipo');
  return { success: true };
}
