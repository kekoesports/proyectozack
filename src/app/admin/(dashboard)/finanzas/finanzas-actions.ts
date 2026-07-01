'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';
import { classifyExpenses } from '@/lib/queries/invoices';
import { EXPENSE_GROUPS, EXPENSE_SUBTYPES, type ExpenseSubtypeValue } from '@/lib/schemas/invoice';

type ActionResult<T = void> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

const classifySchema = z.object({
  ids: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
    z.array(z.coerce.number().int().positive()).min(1),
  ),
  expenseGroup: z.enum(EXPENSE_GROUPS),
  expenseSubtype: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(EXPENSE_SUBTYPES).optional(),
  ),
  preview: z.preprocess(
    (v) => v === 'true' || v === true,
    z.boolean().default(false),
  ),
});

/**
 * Clasifica una o varias facturas de gasto (expenseGroup + expenseSubtype).
 * En modo preview (preview=true) solo devuelve el conteo; no escribe.
 */
export async function classifyExpensesAction(
  formData: FormData,
): Promise<ActionResult<{ count: number; applied: boolean }>> {
  await requirePermission('facturacion', 'write');

  const raw = {
    ids: formData.get('ids'),
    expenseGroup: formData.get('expenseGroup'),
    expenseSubtype: formData.get('expenseSubtype'),
    preview: formData.get('preview'),
  };

  const parsed = classifySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? 'Datos inválidos';
    return { ok: false, error: first };
  }

  const { ids, expenseGroup, expenseSubtype, preview } = parsed.data;

  if (preview) {
    return { ok: true, data: { count: ids.length, applied: false } };
  }

  try {
    await classifyExpenses(ids, {
      expenseGroup,
      expenseSubtype: (expenseSubtype as ExpenseSubtypeValue | undefined) ?? null,
    });
  } catch (err) {
    logRedacted('error', '[finanzas] classifyExpenses error:', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al clasificar los gastos' };
  }

  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/finanzas/resumen');
  revalidatePath('/admin/finanzas/mes');
  revalidatePath('/admin/finanzas/pl');
  revalidatePath('/admin/finanzas/costes');
  revalidatePath('/admin/finanzas/gastos-operativos');
  revalidatePath('/admin/gastos');

  return { ok: true, data: { count: ids.length, applied: true } };
}

const singleClassifySchema = z.object({
  id: z.coerce.number().int().positive(),
  expenseGroup: z.enum(EXPENSE_GROUPS),
  expenseSubtype: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(EXPENSE_SUBTYPES).optional(),
  ),
});

/** Clasifica una sola factura inline desde la tabla. */
export async function updateExpenseClassificationAction(
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission('facturacion', 'write');

  const raw = {
    id: formData.get('id'),
    expenseGroup: formData.get('expenseGroup'),
    expenseSubtype: formData.get('expenseSubtype'),
  };

  const parsed = singleClassifySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? 'Datos inválidos';
    return { ok: false, error: first };
  }

  const { id, expenseGroup, expenseSubtype } = parsed.data;

  try {
    await classifyExpenses([id], {
      expenseGroup,
      expenseSubtype: expenseSubtype ?? null,
    });
  } catch (err) {
    logRedacted('error', '[finanzas] updateExpenseClassification error:', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al clasificar el gasto' };
  }

  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/finanzas/resumen');
  revalidatePath('/admin/finanzas/mes');
  revalidatePath('/admin/finanzas/pl');
  revalidatePath('/admin/finanzas/costes');
  revalidatePath('/admin/finanzas/gastos-operativos');
  revalidatePath('/admin/gastos');

  return { ok: true, data: undefined };
}
