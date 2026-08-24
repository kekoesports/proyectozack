import { and, desc, eq } from 'drizzle-orm';

import { entityAssets } from '@/db/schema/entityAssets';
import { db } from '@/lib/db';

export type EntityAssetKind = 'talent_photo' | 'team_photo' | 'brand_logo';

export type RegisterEntityAssetInput = {
  readonly kind: EntityAssetKind;
  readonly entityId: number;
  readonly storageKey: string;
  readonly contentType: string;
  /** Conserva la fecha real al importar el inventario histórico. */
  readonly createdAt?: Date | undefined;
};

export async function registerEntityAsset(input: RegisterEntityAssetInput): Promise<void> {
  await db
    .insert(entityAssets)
    .values({
      kind: input.kind,
      entityId: input.entityId,
      storageKey: input.storageKey,
      contentType: input.contentType,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .onConflictDoNothing({ target: entityAssets.storageKey });
}

export async function getLatestEntityAsset(
  kind: EntityAssetKind,
  entityId: number,
): Promise<{ storageKey: string; contentType: string } | null> {
  const [asset] = await db
    .select({
      storageKey: entityAssets.storageKey,
      contentType: entityAssets.contentType,
    })
    .from(entityAssets)
    .where(and(eq(entityAssets.kind, kind), eq(entityAssets.entityId, entityId)))
    .orderBy(desc(entityAssets.createdAt), desc(entityAssets.id))
    .limit(1);

  return asset ?? null;
}
