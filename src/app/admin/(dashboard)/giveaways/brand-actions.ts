'use server';

import { revalidatePath } from 'next/cache';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { brandCatalog } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';

export type BrandCatalogEntry = {
  readonly id:         number;
  readonly name:       string;
  readonly logoUrl:    string | null;
  readonly defaultUrl: string | null;
  readonly category:   string | null;
  readonly isActive:   boolean;
  readonly sortOrder:  number;
};

// ── List ─────────────────────────────────────────────────────────────────────

export async function listBrandCatalog(): Promise<BrandCatalogEntry[]> {
  await requirePermission('sorteos', 'read');
  return db.select().from(brandCatalog)
    .orderBy(asc(brandCatalog.sortOrder), asc(brandCatalog.name));
}

// ── Upsert ────────────────────────────────────────────────────────────────────

const BrandSchema = z.object({
  id:         z.coerce.number().int().positive().optional(),
  name:       z.string().trim().min(1).max(150),
  logoUrl:    z.string().trim().max(500).optional().transform(v => v || null),
  defaultUrl: z.string().trim().max(2000).optional().transform(v => v || null),
  category:   z.string().trim().max(50).optional().transform(v => v || null),
  isActive:   z.boolean().default(true),
  sortOrder:  z.coerce.number().int().min(0).default(0),
});

export async function upsertBrandAction(
  data: z.infer<typeof BrandSchema>,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  try {
    await requirePermission('sorteos', 'write');
    const parsed = BrandSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
    const { id, ...rest } = parsed.data;

    if (id) {
      await db.update(brandCatalog).set(rest).where(eq(brandCatalog.id, id));
      revalidatePath('/admin/giveaways');
      return { ok: true, id };
    } else {
      const [inserted] = await db.insert(brandCatalog).values(rest).returning({ id: brandCatalog.id });
      if (!inserted) return { ok: false, error: 'Error al crear marca' };
      revalidatePath('/admin/giveaways');
      return { ok: true, id: inserted.id };
    }
  } catch (err) {
    logRedacted('error', '[brand-catalog] upsert error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado' };
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteBrandAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePermission('sorteos', 'write');
    await db.delete(brandCatalog).where(eq(brandCatalog.id, id));
    revalidatePath('/admin/giveaways');
    return { ok: true };
  } catch (err) {
    logRedacted('error', '[brand-catalog] delete error:', err);
    return { ok: false, error: 'Error al eliminar marca' };
  }
}
