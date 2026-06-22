import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { generatedContracts } from '@/db/schema';
import { contractTemplates } from '@/db/schema/contractTemplates';
import { talents } from '@/db/schema/talents';
import { crmBrands } from '@/db/schema/crmBrands';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type GeneratedContract    = InferSelectModel<typeof generatedContracts>;
export type NewGeneratedContract = InferInsertModel<typeof generatedContracts>;

export type GeneratedContractStatus = 'draft' | 'sent' | 'signed' | 'archived';

export const CONTRACT_STATUSES: { value: GeneratedContractStatus; label: string }[] = [
  { value: 'draft',    label: 'Borrador'   },
  { value: 'sent',     label: 'Enviado'    },
  { value: 'signed',   label: 'Firmado'    },
  { value: 'archived', label: 'Archivado'  },
];

// ── Row con joins para listado ─────────────────────────────────────────

export type GeneratedContractRow = {
  id:           number;
  title:        string;
  status:       string;
  fileName:     string | null;
  fileUrl:      string | null;
  createdAt:    Date;
  sentAt:       Date | null;
  signedAt:     Date | null;
  templateName: string | null;
  talentName:   string | null;
  brandName:    string | null;
};

export async function listGeneratedContracts(): Promise<readonly GeneratedContractRow[]> {
  return db
    .select({
      id:           generatedContracts.id,
      title:        generatedContracts.title,
      status:       generatedContracts.status,
      fileName:     generatedContracts.fileName,
      fileUrl:      generatedContracts.fileUrl,
      createdAt:    generatedContracts.createdAt,
      sentAt:       generatedContracts.sentAt,
      signedAt:     generatedContracts.signedAt,
      templateName: contractTemplates.name,
      talentName:   talents.name,
      brandName:    crmBrands.name,
    })
    .from(generatedContracts)
    .leftJoin(contractTemplates, eq(generatedContracts.templateId, contractTemplates.id))
    .leftJoin(talents,           eq(generatedContracts.talentId,   talents.id))
    .leftJoin(crmBrands,         eq(generatedContracts.brandId,    crmBrands.id))
    .orderBy(desc(generatedContracts.createdAt));
}

export type GeneratedContractDetail = GeneratedContractRow & {
  content:    string;
  varsJson:   string | null;
  notes:      string | null;
  filePath:   string | null;
  campaignId: number | null;
};

export async function getGeneratedContract(id: number): Promise<GeneratedContractDetail | null> {
  const [row] = await db
    .select({
      id:           generatedContracts.id,
      title:        generatedContracts.title,
      status:       generatedContracts.status,
      fileName:     generatedContracts.fileName,
      fileUrl:      generatedContracts.fileUrl,
      filePath:     generatedContracts.filePath,
      createdAt:    generatedContracts.createdAt,
      sentAt:       generatedContracts.sentAt,
      signedAt:     generatedContracts.signedAt,
      content:      generatedContracts.content,
      varsJson:     generatedContracts.varsJson,
      notes:        generatedContracts.notes,
      campaignId:   generatedContracts.campaignId,
      templateName: contractTemplates.name,
      talentName:   talents.name,
      brandName:    crmBrands.name,
    })
    .from(generatedContracts)
    .leftJoin(contractTemplates, eq(generatedContracts.templateId, contractTemplates.id))
    .leftJoin(talents,           eq(generatedContracts.talentId,   talents.id))
    .leftJoin(crmBrands,         eq(generatedContracts.brandId,    crmBrands.id))
    .where(eq(generatedContracts.id, id))
    .limit(1);
  return row ?? null;
}

export async function createGeneratedContract(
  values: Omit<NewGeneratedContract, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<GeneratedContract> {
  const [row] = await db.insert(generatedContracts).values(values).returning();
  if (!row) throw new Error('Failed to insert generated contract');
  return row;
}

export async function updateGeneratedContract(
  id: number,
  patch: Partial<Pick<GeneratedContract,
    'title' | 'status' | 'notes' | 'fileUrl' | 'filePath' | 'fileName' | 'sentAt' | 'signedAt'
  >>,
): Promise<GeneratedContract | null> {
  const [row] = await db
    .update(generatedContracts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(generatedContracts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGeneratedContract(id: number): Promise<void> {
  await db.delete(generatedContracts).where(eq(generatedContracts.id, id));
}

export async function countGeneratedContractsByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: generatedContracts.status, count: sql<number>`count(*)::int` })
    .from(generatedContracts)
    .groupBy(generatedContracts.status)
    .orderBy(asc(generatedContracts.status));
  return Object.fromEntries(rows.map((r) => [r.status, r.count]));
}
