'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { requireAnyRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { agendaItems } from '@/db/schema';
import { AgendaItemSchema, AgendaItemUpdateSchema } from '@/lib/schemas/posts';

function revalidate() {
  revalidatePath('/news');
  revalidatePath('/admin/noticias/agenda');
}

export async function createAgendaItemAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = AgendaItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;
  await db.insert(agendaItems).values({
    title: d.title,
    team1: d.team1 ?? null,
    team2: d.team2 ?? null,
    tournament: d.tournament ?? null,
    matchDate: d.matchDate,
    matchTime: d.matchTime ?? null,
    isLive: d.isLive,
    sortOrder: d.sortOrder,
  });
  revalidate();
}

export async function updateAgendaItemAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = AgendaItemUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, ...d } = parsed.data;
  await db.update(agendaItems).set({
    title: d.title,
    team1: d.team1 ?? null,
    team2: d.team2 ?? null,
    tournament: d.tournament ?? null,
    matchDate: d.matchDate,
    matchTime: d.matchTime ?? null,
    isLive: d.isLive,
    sortOrder: d.sortOrder,
  }).where(eq(agendaItems.id, id));
  revalidate();
}

export async function deleteAgendaItemAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const id = parseInt(String(formData.get('id')), 10);
  if (isNaN(id)) return;
  await db.delete(agendaItems).where(eq(agendaItems.id, id));
  revalidate();
}
