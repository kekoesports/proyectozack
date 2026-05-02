'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { createGiveaway, deleteGiveaway } from '@/lib/queries/giveaways';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { validateRedirectField } from '@/lib/security/validateRedirectField';
import { ALLOWED_REDIRECT_HOSTS } from '@/lib/security/allowed-redirect-hosts';
import {
  CreateGiveawayFormSchema,
  DeleteGiveawaySchema,
} from '@/lib/schemas/giveaway';

export type GiveawayActionState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> };

export async function createGiveawayAction(formData: FormData): Promise<GiveawayActionState> {
  await requireRole('admin', '/admin/login');

  const parsed = parseFormData(formData, CreateGiveawayFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createGiveawayAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const safe = validateRedirectField(parsed.data.redirectUrl, ALLOWED_REDIRECT_HOSTS, '[createGiveawayAction]');
  if (!safe.ok) return safe;

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
    endsAt: parsed.data.endsAt,
    sortOrder: parsed.data.sortOrder,
  });

  if (parsed.data.talentSlug) revalidatePath(`/creadores/${parsed.data.talentSlug}`);
  revalidatePath('/admin/giveaways');
  return { ok: true };
}

export async function deleteGiveawayAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const parsed = parseFormData(formData, DeleteGiveawaySchema);
  if (!parsed.ok) return;
  await deleteGiveaway(parsed.data.id);
  if (parsed.data.talentSlug) revalidatePath(`/creadores/${parsed.data.talentSlug}`);
  revalidatePath('/admin/giveaways');
}
