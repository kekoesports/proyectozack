'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';

export async function setFeaturedLiveAction(talentId: number, value: boolean): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  await db.update(talents).set({ featuredLive: value }).where(eq(talents.id, talentId));
  revalidatePath('/admin/live');
}

export async function setExcludeFromLiveAction(talentId: number, value: boolean): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  await db.update(talents).set({ excludeFromLive: value }).where(eq(talents.id, talentId));
  revalidatePath('/admin/live');
}
