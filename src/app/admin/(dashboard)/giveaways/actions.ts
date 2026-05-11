'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { createGiveaway, updateGiveaway, deleteGiveaway } from '@/lib/queries/giveaways';
import { like, eq } from 'drizzle-orm';
import { giveaways } from '@/db/schema';
import { db } from '@/lib/db';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import {
  CreateGiveawayFormSchema,
  DeleteGiveawaySchema,
  UpdateGiveawayFormSchema,
} from '@/lib/schemas/giveaway';

export type GiveawayActionState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> };

/**
 * Invalida TODAS las rutas que muestran sorteos. Llamar después de cada
 * mutation (create/update/delete/setFeatured/setBadge) para que /sorteos,
 * /giveaways y los perfiles de creator/talent reflejen el cambio sin
 * esperar el revalidate=3600 ISR.
 *
 * Bug recurrente histórico: actions individuales invalidaban paths sueltas
 * inconsistentemente (algunos `/giveaways`, otros `/creadores/${slug}` que
 * ni existía como ruta, ninguno `/sorteos`). Resultado: DEQIUV/JOLU/...
 * no aparecían hasta 1h después de creación. Este helper es la única vía
 * autorizada.
 */
function revalidateGiveawayPaths(talentSlug?: string | null): void {
  revalidatePath('/sorteos');
  revalidatePath('/giveaways');
  revalidatePath('/admin/giveaways');
  if (talentSlug) {
    revalidatePath(`/talentos/${talentSlug}`);
    revalidatePath(`/creadores/${talentSlug}`);
  }
}

export async function createGiveawayAction(formData: FormData): Promise<GiveawayActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, CreateGiveawayFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createGiveawayAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  await createGiveaway({
    talentId: parsed.data.talentId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    imageUrl: parsed.data.imageUrl ?? null,
    brandName: parsed.data.brandName,
    brandLogo: parsed.data.brandLogo ?? null,
    value: parsed.data.value ?? null,
    redirectUrl: parsed.data.redirectUrl,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt ?? null,
    sortOrder: parsed.data.sortOrder,
  });

  revalidateGiveawayPaths(parsed.data.talentSlug);
  return { ok: true };
}

export async function updateGiveawayAction(formData: FormData): Promise<GiveawayActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, UpdateGiveawayFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[updateGiveawayAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { id, talentSlug, ...data } = parsed.data;
  await updateGiveaway(id, data);

  revalidateGiveawayPaths(talentSlug);
  return { ok: true };
}

export async function setGiveawayFeaturedAction(id: number, value: boolean): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  await db.update(giveaways).set({ isFeatured: value }).where(eq(giveaways.id, id));
  revalidateGiveawayPaths();
}

export async function setGiveawayBadgeAction(id: number, badge: string | null): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  await db.update(giveaways).set({ badge: badge ?? null }).where(eq(giveaways.id, id));
  revalidateGiveawayPaths();
}

export async function setGiveawayBadgeFromFormAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const id = Number(formData.get('giveawayId'));
  const badge = (formData.get('badge') as string) || null;
  if (!id) return;
  await db.update(giveaways).set({ badge }).where(eq(giveaways.id, id));
  revalidateGiveawayPaths();
}

export async function deleteAllDemosAction(): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  await db.delete(giveaways).where(like(giveaways.title, '[DEMO]%'));
  revalidateGiveawayPaths();
}

export async function deleteGiveawayAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = parseFormData(formData, DeleteGiveawaySchema);
  if (!parsed.ok) return;
  await deleteGiveaway(parsed.data.id);
  revalidateGiveawayPaths(parsed.data.talentSlug);
}
