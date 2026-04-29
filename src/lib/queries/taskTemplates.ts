import { asc, eq } from 'drizzle-orm';

import { crmTaskTemplates } from '@/db/schema';
import { db } from '@/lib/db';

import type { CrmTaskTemplate, NewCrmTaskTemplate } from '@/types';

type CreateTaskTemplateInput = Omit<NewCrmTaskTemplate, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Lista todas las plantillas de tareas recurrentes del CRM (18 seed-eadas).
 *
 * @cache none
 * @visibility admin
 * @returns array (puede ser vacío). Nunca null. Ordenado por `title` ASC.
 */
export async function listTaskTemplates(): Promise<readonly CrmTaskTemplate[]> {
  return db.select().from(crmTaskTemplates).orderBy(asc(crmTaskTemplates.title));
}

/**
 * Crea una nueva plantilla de tarea recurrente para el CRM.
 *
 * @cache none
 * @visibility admin
 * @returns la fila insertada. Lanza si la inserción falla.
 */
export async function createTaskTemplate(input: CreateTaskTemplateInput): Promise<CrmTaskTemplate> {
  const [row] = await db.insert(crmTaskTemplates).values(input).returning();
  if (!row) throw new Error('Failed to create task template');
  return row;
}

/**
 * Actualiza parcialmente una plantilla de tarea recurrente y refresca `updatedAt`.
 *
 * @cache none
 * @visibility admin
 * @returns la fila actualizada o `undefined` si no existe.
 */
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

/**
 * Borra una plantilla de tarea recurrente por id.
 *
 * @cache none
 * @visibility admin
 * @returns void.
 */
export async function deleteTaskTemplate(id: number): Promise<void> {
  await db.delete(crmTaskTemplates).where(eq(crmTaskTemplates.id, id));
}
