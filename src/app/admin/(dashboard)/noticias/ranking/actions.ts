'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { rankingEntries } from '@/db/schema';

function revalidate() {
  revalidatePath('/news');
  revalidatePath('/admin/noticias/ranking');
}

const RankingSchema = z.object({
  position: z.string().transform(Number).pipe(z.number().int().min(1).max(99)),
  teamName: z.string().min(1).max(100),
  teamLogo: z.string().url().max(500).optional().or(z.literal('')).transform(v => v || null),
  country: z.string().max(3).optional().transform(v => v || null),
  points: z.string().transform(Number).pipe(z.number().int().min(0)),
  sortOrder: z.string().optional().transform(v => v ? parseInt(v, 10) : 0),
});

const RankingUpdateSchema = RankingSchema.extend({
  id: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function createRankingEntryAction(formData: FormData): Promise<void> {
  await requirePermission('rankings', 'write');
  const parsed = RankingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;
  await db.insert(rankingEntries).values({
    position: d.position,
    teamName: d.teamName,
    teamLogo: d.teamLogo ?? null,
    country: d.country ?? null,
    points: d.points,
    sortOrder: d.sortOrder,
  });
  revalidate();
}

export async function updateRankingEntryAction(formData: FormData): Promise<void> {
  await requirePermission('rankings', 'write');
  const parsed = RankingUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, ...d } = parsed.data;
  await db.update(rankingEntries).set({
    position: d.position,
    teamName: d.teamName,
    teamLogo: d.teamLogo ?? null,
    country: d.country ?? null,
    points: d.points,
    sortOrder: d.sortOrder,
  }).where(eq(rankingEntries.id, id));
  revalidate();
}

export async function deleteRankingEntryAction(formData: FormData): Promise<void> {
  await requirePermission('rankings', 'delete');
  const id = parseInt(String(formData.get('id')), 10);
  if (isNaN(id)) return;
  await db.delete(rankingEntries).where(eq(rankingEntries.id, id));
  revalidate();
}
