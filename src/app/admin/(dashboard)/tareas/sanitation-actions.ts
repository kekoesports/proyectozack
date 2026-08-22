'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';
import { sanitizeTask } from '@/lib/queries/task-sanitation';
import { sanitizeTaskSchema } from '@/lib/schemas/task-sanitation';

type ActionResult = { ok: true } | { ok: false; error: string };

export async function sanitizeTaskAction(formData: FormData): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'write');
  const parsed = sanitizeTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const result = await sanitizeTask({
    taskId: parsed.data.taskId,
    action: parsed.data.action,
    ...(parsed.data.dueDate ? { dueDate: parsed.data.dueDate } : {}),
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
    session: { userId: session.user.id, role: session.user.role },
  });
  if (result.ok) {
    revalidatePath('/admin/tareas/saneamiento');
    revalidatePath('/admin/tareas');
    revalidatePath('/admin/mi-semana');
  }
  return result;
}
