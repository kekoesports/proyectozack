'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { getFeaturedFallbackCount } from '@/lib/queries/live';
import { StrictIdSchema, StrictBooleanSchema } from '@/lib/schemas/common';

const FEATURED_FALLBACK_MAX = 10;

const LiveToggleArgsSchema = z.tuple([StrictIdSchema, StrictBooleanSchema]);
const FallbackArgsSchema   = z.tuple([StrictIdSchema, StrictBooleanSchema, z.number().int().optional()]);

export async function setFeaturedLiveAction(talentId: number, value: boolean): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = LiveToggleArgsSchema.safeParse([talentId, value]);
  if (!parsed.success) return;
  const [id, v] = parsed.data;
  await db.update(talents).set({ featuredLive: v }).where(eq(talents.id, id));
  revalidatePath('/admin/live');
  revalidatePath(`/admin/talents/${id}`);
}

export async function setExcludeFromLiveAction(talentId: number, value: boolean): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = LiveToggleArgsSchema.safeParse([talentId, value]);
  if (!parsed.success) return;
  const [id, v] = parsed.data;
  await db.update(talents).set({ excludeFromLive: v }).where(eq(talents.id, id));
  revalidatePath('/admin/live');
  revalidatePath(`/admin/talents/${id}`);
}

export async function setFeaturedFallbackAction(talentId: number, value: boolean, currentCount?: number): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  // El currentCount del cliente se ignora: re-leemos el contador en el server
  // para evitar bypass del límite manipulando el bound arg.
  const parsed = FallbackArgsSchema.safeParse([talentId, value, currentCount]);
  if (!parsed.success) return;
  const [id, v] = parsed.data;
  if (v) {
    const serverCount = await getFeaturedFallbackCount();
    if (serverCount >= FEATURED_FALLBACK_MAX) return;
  }
  await db.update(talents).set({ featuredFallback: v }).where(eq(talents.id, id));
  revalidatePath('/admin/live');
  revalidatePath(`/admin/talents/${id}`);
}
