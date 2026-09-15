'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { posts } from '@/db/schema/posts';
import { pressOutreachCondition } from '@/lib/queries/content-channel';
import { PressDraftUpdateSchema } from '@/lib/schemas/press-drafts';

export async function updatePressDraftAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission('prensa_targets', 'write');
  const parsed = PressDraftUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Revisa el título, resumen, autor y contenido.' };
  const { id, ...data } = parsed.data;
  // Only text is editable here. The client cannot change the destination or publish/send.
  const updated = await db.update(posts).set(data)
    .where(and(eq(posts.id, id), pressOutreachCondition))
    .returning({ id: posts.id });
  if (!updated.length) return { ok: false, error: 'Propuesta para medios no encontrada.' };
  revalidatePath('/admin/prensa-targets');
  revalidatePath(`/admin/prensa-targets/articulos/${id}`);
  redirect('/admin/prensa-targets');
}
