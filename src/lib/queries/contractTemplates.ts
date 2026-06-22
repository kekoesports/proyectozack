import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contractTemplates } from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ContractTemplate    = InferSelectModel<typeof contractTemplates>;
export type NewContractTemplate = InferInsertModel<typeof contractTemplates>;

export { TEMPLATE_TYPES, type TemplateType } from '@/lib/contractVariables';

// ── Queries ───────────────────────────────────────────────────────────

export async function listContractTemplates(includeInactive = false): Promise<readonly ContractTemplate[]> {
  const query = db.select().from(contractTemplates).orderBy(asc(contractTemplates.type), asc(contractTemplates.name));
  if (!includeInactive) {
    return query.where(eq(contractTemplates.isActive, true));
  }
  return query;
}

export async function getContractTemplate(id: number): Promise<ContractTemplate | null> {
  const [row] = await db.select().from(contractTemplates)
    .where(eq(contractTemplates.id, id)).limit(1);
  return row ?? null;
}

export async function createContractTemplate(
  values: Pick<NewContractTemplate, 'name' | 'type' | 'content'>,
): Promise<ContractTemplate> {
  const [row] = await db.insert(contractTemplates)
    .values({ ...values, isActive: true })
    .returning();
  if (!row) throw new Error('Failed to insert contract template');
  return row;
}

export async function updateContractTemplate(
  id: number,
  patch: Partial<Pick<ContractTemplate, 'name' | 'type' | 'content' | 'isActive'>>,
): Promise<ContractTemplate | null> {
  const [row] = await db.update(contractTemplates)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(contractTemplates.id, id))
    .returning();
  return row ?? null;
}

export async function deleteContractTemplate(id: number): Promise<void> {
  await db.delete(contractTemplates).where(eq(contractTemplates.id, id));
}
