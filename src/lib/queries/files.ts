import { db } from '@/lib/db';
import { files } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

import type { FileRelatedType, FileType } from '@/lib/schemas/file';
import type { FileRecord } from '@/types';

export async function createFile(input: {
  name: string;
  type: FileType;
  mime?: string;
  sizeBytes?: number;
  url: string;
  path?: string;
  relatedType: FileRelatedType;
  relatedId: number;
  platform?: string;
  notes?: string;
  uploadedByUserId?: string;
}): Promise<FileRecord> {
  const [row] = await db.insert(files).values(input).returning();
  if (!row) throw new Error('[files] insert returned no row');
  return row;
}

export async function listFilesByEntity(
  relatedType: FileRelatedType,
  relatedId: number,
  type?: FileType,
): Promise<FileRecord[]> {
  const conditions = [
    eq(files.relatedType, relatedType),
    eq(files.relatedId, relatedId),
  ];
  if (type) conditions.push(eq(files.type, type));
  return db.select().from(files).where(and(...conditions)).orderBy(files.createdAt);
}

export async function deleteFileById(id: number): Promise<FileRecord | undefined> {
  const [row] = await db.delete(files).where(eq(files.id, id)).returning();
  return row ?? undefined;
}
