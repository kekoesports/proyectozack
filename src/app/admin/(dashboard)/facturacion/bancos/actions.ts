'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { assertCanDelete } from '@/lib/permissions';
import { createBankAccountSchema } from '@/lib/schemas/bankReconciliation';
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccount,
} from '@/lib/queries/bankReconciliation';
import { logRedacted } from '@/lib/log';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly id?: number;
};

export async function createBankAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission('bancos', 'write');
    const parsed = createBankAccountSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { error: first?.message ?? 'Datos inválidos' };
    }
    const account = await createBankAccount({ ...parsed.data });
    revalidatePath('/admin/facturacion/bancos');
    return { success: true, id: account.id };
  } catch (err) {
    logRedacted('error', 'createBankAccountAction', err);
    return { error: 'No se pudo crear la cuenta bancaria' };
  }
}

export async function deleteBankAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission('bancos', 'delete');
    assertCanDelete(session.user.role as 'admin');

    const id = Number(formData.get('id'));
    if (!id || id < 1) return { error: 'ID inválido' };

    const existing = await getBankAccount(id);
    if (!existing) return { error: 'Cuenta no encontrada' };

    await deleteBankAccount(id);
    revalidatePath('/admin/facturacion/bancos');
    return { success: true };
  } catch (err) {
    logRedacted('error', 'deleteBankAccountAction', err);
    return { error: 'No se pudo eliminar la cuenta bancaria' };
  }
}
