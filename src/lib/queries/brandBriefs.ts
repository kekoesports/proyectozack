import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brandBriefs, user } from '@/db/schema';
import type { BrandBrief, BrandBriefWithUser, NewBrandBrief } from '@/types';

export async function listBriefs(brandId: number): Promise<readonly BrandBriefWithUser[]> {
  const rows = await db
    .select({
      id:                brandBriefs.id,
      brandId:           brandBriefs.brandId,
      name:              brandBriefs.name,
      version:           brandBriefs.version,
      geo:               brandBriefs.geo,
      status:            brandBriefs.status,
      sourceFileUrl:     brandBriefs.sourceFileUrl,
      sourceFilePath:    brandBriefs.sourceFilePath,
      sourceFileName:    brandBriefs.sourceFileName,
      sourceFileMime:    brandBriefs.sourceFileMime,
      extractedData:     brandBriefs.extractedData,
      rawText:           brandBriefs.rawText,
      briefContent:      brandBriefs.briefContent,
      notes:             brandBriefs.notes,
      createdByUserId:   brandBriefs.createdByUserId,
      reviewedByUserId:  brandBriefs.reviewedByUserId,
      reviewedAt:        brandBriefs.reviewedAt,
      createdAt:         brandBriefs.createdAt,
      updatedAt:         brandBriefs.updatedAt,
      createdByName:     user.name,
      reviewedByName:    user.name,
    })
    .from(brandBriefs)
    .leftJoin(user, eq(user.id, brandBriefs.createdByUserId))
    .where(eq(brandBriefs.brandId, brandId))
    .orderBy(desc(brandBriefs.createdAt));

  return rows as BrandBriefWithUser[];
}

export async function getBrief(id: number): Promise<BrandBrief | null> {
  const [row] = await db.select().from(brandBriefs).where(eq(brandBriefs.id, id)).limit(1);
  return row ?? null;
}

export async function createBrief(
  values: Omit<NewBrandBrief, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<BrandBrief> {
  const [row] = await db.insert(brandBriefs).values(values).returning();
  if (!row) throw new Error('Failed to insert brand brief');
  return row;
}

export async function updateBrief(
  id: number,
  patch: Partial<Pick<BrandBrief, 'name' | 'version' | 'geo' | 'status' | 'notes' | 'briefContent' | 'reviewedByUserId' | 'reviewedAt'>>,
): Promise<BrandBrief | null> {
  const [row] = await db
    .update(brandBriefs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(brandBriefs.id, id))
    .returning();
  return row ?? null;
}

export async function deleteBrief(id: number): Promise<void> {
  await db.delete(brandBriefs).where(eq(brandBriefs.id, id));
}
