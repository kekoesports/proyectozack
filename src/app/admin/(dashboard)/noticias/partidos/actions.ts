'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { matches } from '@/db/schema';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { IdSchema } from '@/lib/schemas/common';
import { logRedacted } from '@/lib/log';

type ActionResult = { ok: true } | { ok: false; error: string };

const MatchSchema = z.object({
  team1:       z.string().trim().min(1, 'Equipo A obligatorio').max(100),
  team2:       z.string().trim().min(1, 'Equipo B obligatorio').max(100),
  team1Logo:   z.string().url().max(500).optional().or(z.literal('')).transform(v => v || null),
  team2Logo:   z.string().url().max(500).optional().or(z.literal('')).transform(v => v || null),
  tournament:  z.string().trim().max(200).optional().transform(v => v || null),
  matchDate:   z.string().optional().transform(v => v || null),
  matchTime:   z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')).transform(v => v || null),
  matchStatus: z.enum(['upcoming', 'live', 'finished']).optional().transform(v => v ?? 'upcoming'),
  isActive:    z.string().optional().transform(v => v === 'on' || v === 'true'),
});

const MatchUpdateSchema = MatchSchema.extend({
  id: IdSchema,
});

function revalidate() {
  revalidatePath('/news');
  revalidatePath('/admin/noticias/partidos');
}

export async function createMatchAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requirePermission('noticias', 'publish');
  const parsed = parseFormData(formData, MatchSchema);
  if (!parsed.ok) return { ok: false, error: firstError(parsed.fieldErrors) };
  try {
    await db.insert(matches).values(parsed.data);
    revalidate();
  } catch (err) {
    logRedacted('error', '[admin] createMatch error:', err);
    return { ok: false, error: 'Error al crear partido' };
  }
  redirect('/admin/noticias/partidos');
}

export async function updateMatchAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requirePermission('noticias', 'publish');
  const parsed = parseFormData(formData, MatchUpdateSchema);
  if (!parsed.ok) return { ok: false, error: firstError(parsed.fieldErrors) };
  const { id, ...data } = parsed.data;
  try {
    await db.update(matches).set({ ...data, updatedAt: new Date() }).where(eq(matches.id, id));
    revalidate();
  } catch (err) {
    logRedacted('error', '[admin] updateMatch error:', err);
    return { ok: false, error: 'Error al guardar partido' };
  }
  redirect('/admin/noticias/partidos');
}

export async function deleteMatchAction(formData: FormData): Promise<void> {
  await requirePermission('noticias', 'publish');
  const idRaw = formData.get('id');
  const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (isNaN(id)) return;
  await db.delete(matches).where(eq(matches.id, id));
  revalidate();
}

export async function setMatchFeaturedAction(formData: FormData): Promise<void> {
  await requirePermission('noticias', 'publish');
  const idRaw = formData.get('id');
  const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (isNaN(id)) return;
  // Un solo destacado a la vez
  await db.update(matches).set({ isFeatured: false });
  await db.update(matches).set({ isFeatured: true }).where(eq(matches.id, id));
  revalidate();
}

export async function toggleMatchActiveAction(formData: FormData): Promise<void> {
  await requirePermission('noticias', 'publish');
  const idRaw      = formData.get('id');
  const currentRaw = formData.get('current');
  const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (isNaN(id)) return;
  const current = currentRaw === 'true';
  await db.update(matches).set({ isActive: !current, updatedAt: new Date() }).where(eq(matches.id, id));
  revalidate();
}
