'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { newsAlerts } from '@/db/schema';
import { requireAnyRole } from '@/lib/auth-guard';

export async function markNewsAlertReadAction(id: number): Promise<void> {
  await requireAnyRole(['admin', 'admin_limited_tasks', 'manager', 'editor', 'ops'], '/admin/login');
  await db
    .update(newsAlerts)
    .set({ readAt: new Date() })
    .where(eq(newsAlerts.id, id));
  revalidatePath('/admin/alertas');
  revalidatePath('/admin');
}

export async function dismissNewsAlertAction(id: number): Promise<void> {
  await requireAnyRole(['admin', 'admin_limited_tasks', 'manager', 'editor', 'ops'], '/admin/login');
  await db
    .update(newsAlerts)
    .set({ readAt: new Date(), dismissedAt: new Date() })
    .where(eq(newsAlerts.id, id));
  revalidatePath('/admin/alertas');
  revalidatePath('/admin');
}

export async function markAllReadAction(): Promise<void> {
  await requireAnyRole(['admin', 'admin_limited_tasks', 'manager'], '/admin/login');
  await db
    .update(newsAlerts)
    .set({ readAt: new Date() });
  revalidatePath('/admin/alertas');
  revalidatePath('/admin');
}
