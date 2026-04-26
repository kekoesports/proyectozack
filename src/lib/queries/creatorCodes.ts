import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorCodes } from '@/db/schema';
import type { CreatorCode, CreatorCodeWithTalent } from '@/types';

export async function getAllCodes(): Promise<CreatorCodeWithTalent[]> {
  const rows = await db.query.creatorCodes.findMany({
    with: { talent: true },
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
  return rows as CreatorCodeWithTalent[];
}

export async function getFeaturedCodes(): Promise<CreatorCodeWithTalent[]> {
  const rows = await db.query.creatorCodes.findMany({
    where: (c, { eq }) => eq(c.isFeatured, true),
    with: { talent: true },
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
  return rows as CreatorCodeWithTalent[];
}

export async function getCodesByTalent(talentId: number): Promise<CreatorCode[]> {
  return db
    .select()
    .from(creatorCodes)
    .where(eq(creatorCodes.talentId, talentId))
    .orderBy(asc(creatorCodes.sortOrder));
}

export async function createCode(data: {
  talentId: number;
  code: string;
  brandName: string;
  brandLogo?: string | null;
  redirectUrl: string;
  description?: string | null;
  badge?: string | null;
  isFeatured?: boolean;
  category?: string | null;
  ctaText?: string | null;
  sortOrder?: number;
}): Promise<CreatorCode> {
  const [row] = await db.insert(creatorCodes).values(data).returning();
  return row!;
}

export async function deleteCode(id: number): Promise<void> {
  await db.delete(creatorCodes).where(eq(creatorCodes.id, id));
}
