import { asc, eq } from 'drizzle-orm';

import { crmTaskTemplates } from '@/db/schema';
import { db } from '@/lib/db';

import type { CrmTaskTemplate, NewCrmTaskTemplate } from '@/types';

type CreateTaskTemplateInput = Omit<NewCrmTaskTemplate, 'id' | 'createdAt' | 'updatedAt'>;

export async function listTaskTemplates(): Promise<readonly CrmTaskTemplate[]> {
  return db.select().from(crmTaskTemplates).orderBy(asc(crmTaskTemplates.title));
}

export async function createTaskTemplate(input: CreateTaskTemplateInput): Promise<CrmTaskTemplate> {
  const [row] = await db.insert(crmTaskTemplates).values(input).returning();
  if (!row) throw new Error('Failed to create task template');
  return row;
}

export async function updateTaskTemplate(
  id: number,
  patch: Partial<CreateTaskTemplateInput>,
): Promise<CrmTaskTemplate | undefined> {
  const [row] = await db
    .update(crmTaskTemplates)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(crmTaskTemplates.id, id))
    .returning();

  return row ?? undefined;
}

export async function deleteTaskTemplate(id: number): Promise<void> {
  await db.delete(crmTaskTemplates).where(eq(crmTaskTemplates.id, id));
}
