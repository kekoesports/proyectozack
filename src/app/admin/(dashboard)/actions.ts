'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { dismissAlert, dismissAllPersonalAlerts } from '@/lib/queries/alerts';
import { IdSchema } from '@/lib/schemas/common';

type ActionResult = { readonly error?: string };

function revalidateLayout(): void {
  revalidatePath('/admin', 'layout');
}

export async function dismissAlertAction(id: unknown): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const parsed  = IdSchema.safeParse(id);
  if (!parsed.success) return { error: 'ID inválido' };
  await dismissAlert(parsed.data, session.user.id);
  revalidateLayout();
  return {};
}

export async function dismissAllAlertsAction(): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  await dismissAllPersonalAlerts(session.user.id);
  revalidateLayout();
  return {};
}
