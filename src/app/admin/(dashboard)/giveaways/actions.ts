'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { createGiveaway, updateGiveaway, deleteGiveaway } from '@/lib/queries/giveaways';
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

  if (parsed.data.talentSlug) revalidatePath(`/creadores/${parsed.data.talentSlug}`);
  revalidatePath('/admin/giveaways');
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

  if (talentSlug) revalidatePath(`/creadores/${talentSlug}`);
  if (talentSlug) revalidatePath(`/talentos/${talentSlug}`);
  revalidatePath('/admin/giveaways');
  return { ok: true };
}

export async function deleteGiveawayAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = parseFormData(formData, DeleteGiveawaySchema);
  if (!parsed.ok) return;
  await deleteGiveaway(parsed.data.id);
  if (parsed.data.talentSlug) revalidatePath(`/creadores/${parsed.data.talentSlug}`);
  revalidatePath('/admin/giveaways');
}
