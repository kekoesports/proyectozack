'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { createGiveaway, updateGiveaway, deleteGiveaway } from '@/lib/queries/giveaways';
import { like, eq } from 'drizzle-orm';
import { giveaways } from '@/db/schema';
import { db } from '@/lib/db';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { StrictIdSchema, StrictBooleanSchema } from '@/lib/schemas/common';
import {
  BadgeSchema,
  CreateGiveawayFormSchema,
  DeleteGiveawaySchema,
  UpdateGiveawayFormSchema,
  type BadgeValue,
} from '@/lib/schemas/giveaway';

const ToggleArgsSchema      = z.tuple([StrictIdSchema, StrictBooleanSchema]);
const BadgeBoundArgsSchema  = z.tuple([StrictIdSchema, BadgeSchema.nullable()]);

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
function revalidateGiveawayPaths(talentSlug?: string | null, talentId?: number): void {
  revalidatePath('/sorteos');
  revalidatePath('/giveaways');
  revalidatePath('/admin/giveaways');
  if (talentSlug) {
    revalidatePath(`/talentos/${talentSlug}`);
    revalidatePath(`/creadores/${talentSlug}`);
  }
  if (talentId) {
    revalidatePath(`/admin/talents/${talentId}`);
  }
}

export async function createGiveawayAction(formData: FormData): Promise<GiveawayActionState> {
  await requirePermission('sorteos', 'write');

  const parsed = parseFormData(formData, CreateGiveawayFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createGiveawayAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  await createGiveaway({
    talentId:    parsed.data.talentId,
    title:       parsed.data.title,
    description: parsed.data.description ?? null,
    imageUrl:    parsed.data.imageUrl    ?? null,
    brandName:   parsed.data.brandName,
    brandLogo:   parsed.data.brandLogo  ?? null,
    value:       parsed.data.value      ?? null,
    redirectUrl: parsed.data.redirectUrl,
    startsAt:    parsed.data.startsAt,
    endsAt:      parsed.data.endsAt     ?? null,
    sortOrder:   parsed.data.sortOrder,
    crmBrandId:  parsed.data.crmBrandId ?? null,
  });

  revalidateGiveawayPaths(parsed.data.talentSlug, parsed.data.talentId);
  return { ok: true };
}

export async function updateGiveawayAction(formData: FormData): Promise<GiveawayActionState> {
  await requirePermission('sorteos', 'write');

  const parsed = parseFormData(formData, UpdateGiveawayFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[updateGiveawayAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { id, talentSlug, talentId, ...data } = parsed.data;
  await updateGiveaway(id, data);

  revalidateGiveawayPaths(talentSlug, talentId);
  return { ok: true };
}

export async function setGiveawayFeaturedAction(id: number, value: boolean): Promise<void> {
  await requirePermission('sorteos', 'write');
  const parsed = ToggleArgsSchema.safeParse([id, value]);
  if (!parsed.success) return;
  const [pid, pval] = parsed.data;
  await db.update(giveaways).set({ isFeatured: pval }).where(eq(giveaways.id, pid));
  revalidateGiveawayPaths();
}

export async function setGiveawayBadgeAction(id: number, badge: BadgeValue | null): Promise<void> {
  await requirePermission('sorteos', 'write');
  const parsed = BadgeBoundArgsSchema.safeParse([id, badge]);
  if (!parsed.success) return;
  const [pid, pbadge] = parsed.data;
  await db.update(giveaways).set({ badge: pbadge }).where(eq(giveaways.id, pid));
  revalidateGiveawayPaths();
}

export async function setGiveawayBadgeFromFormAction(formData: FormData): Promise<void> {
  await requirePermission('sorteos', 'write');
  const rawId = formData.get('giveawayId');
  const id = typeof rawId === 'string' ? Number(rawId) : NaN;
  if (!id || isNaN(id)) return;
  const rawBadge = formData.get('badge');
  if (typeof rawBadge !== 'string' || rawBadge === '') return;
  const parsed = BadgeSchema.safeParse(rawBadge);
  if (!parsed.success) return;
  await db.update(giveaways).set({ badge: parsed.data }).where(eq(giveaways.id, id));
  revalidateGiveawayPaths();
}

export async function deleteAllDemosAction(): Promise<void> {
  await requirePermission('sorteos', 'delete');
  await db.delete(giveaways).where(like(giveaways.title, '[DEMO]%'));
  revalidateGiveawayPaths();
}

export async function deleteGiveawayAction(formData: FormData): Promise<void> {
  await requirePermission('sorteos', 'delete');
  const parsed = parseFormData(formData, DeleteGiveawaySchema);
  if (!parsed.ok) return;
  await deleteGiveaway(parsed.data.id);
  revalidateGiveawayPaths(parsed.data.talentSlug);
}
