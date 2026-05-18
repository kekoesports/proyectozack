'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { caseStudies } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';

export async function deleteCaseAction(formData: FormData): Promise<void> {
  await requirePermission('campanas', 'delete');
  const id = Number(formData.get('id'));
  if (!id) return;
  await db.delete(caseStudies).where(eq(caseStudies.id, id));
  revalidatePath('/admin/cases');
  revalidatePath('/');
}
