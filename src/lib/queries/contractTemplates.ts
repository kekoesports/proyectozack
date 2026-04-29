import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contractTemplates } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type ContractTemplate = InferSelectModel<typeof contractTemplates>;

export async function listContractTemplates(): Promise<readonly ContractTemplate[]> {
  return db.select().from(contractTemplates)
    .where(eq(contractTemplates.isActive, true))
    .orderBy(asc(contractTemplates.id));
}

export async function getContractTemplate(id: number): Promise<ContractTemplate | null> {
  const [row] = await db.select().from(contractTemplates)
    .where(eq(contractTemplates.id, id)).limit(1);
  return row ?? null;
}
