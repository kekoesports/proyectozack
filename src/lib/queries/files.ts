import { db } from '@/lib/db';
import { files } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

import type { FileRelatedType, FileType } from '@/lib/schemas/file';
import type { FileRecord } from '@/types';

/**
 * Inserta un fichero en la tabla polimórfica `files` (talents, campaigns, invoices, etc.).
 *
 * @cache none
 * @visibility admin
 * @returns la fila creada (`FileRecord`). Lanza si el insert no devuelve fila.
 */
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

/**
 * Lista ficheros asociados a una entidad (`relatedType` + `relatedId`), opcionalmente
 * filtrados por `type`. Ordenado por `createdAt ASC`.
 *
 * @cache none
 * @visibility admin
 * @returns array de `FileRecord` (puede ser vacío).
 */
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

/**
 * Borra un fichero por id. La acción que la invoca debe llamar a `assertCanDelete`
 * (manager NO puede borrar archivos).
 *
 * @cache none
 * @visibility admin
 * @scope admin (manager bloqueado en la action layer)
 * @returns la fila borrada o `undefined` si no existía.
 */
export async function deleteFileById(id: number): Promise<FileRecord | undefined> {
  const [row] = await db.delete(files).where(eq(files.id, id)).returning();
  return row ?? undefined;
}
