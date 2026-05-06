'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { createCode, deleteCode, updateCode } from '@/lib/queries/creatorCodes';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { validateRedirectField } from '@/lib/security/validateRedirectField';
import { ALLOWED_REDIRECT_HOSTS } from '@/lib/security/allowed-redirect-hosts';
import {
  CreateCodeFormSchema,
  DeleteByIdSchema,
  UpdateCodeFormSchema,
} from '@/lib/schemas/giveaway';

export type CodeActionState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> };

export async function createCodeAction(formData: FormData): Promise<CodeActionState> {
  await requireRole('admin', '/admin/login');

  const parsed = parseFormData(formData, CreateCodeFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createCodeAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const safe = validateRedirectField(parsed.data.redirectUrl, ALLOWED_REDIRECT_HOSTS, '[createCodeAction]');
  if (!safe.ok) return safe;

  const { talentId, code, brandName, brandLogo, redirectUrl, description, badge, isFeatured, category, ctaText } = parsed.data;

  await createCode({
    talentId,
    code,
    brandName,
    brandLogo: brandLogo ?? null,
    redirectUrl,
    description: description ?? null,
    badge: badge ?? null,
    isFeatured,
    category: category ?? null,
    ctaText: ctaText ?? null,
  });
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
  return { ok: true };
}

export async function updateCodeAction(formData: FormData): Promise<CodeActionState> {
  await requireRole('admin', '/admin/login');

  const parsed = parseFormData(formData, UpdateCodeFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[updateCodeAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { id, talentId, code, brandName, brandLogo, redirectUrl, description, badge, isFeatured, category, ctaText } = parsed.data;

  await updateCode(id, { talentId, code, brandName, brandLogo: brandLogo ?? null, redirectUrl, description: description ?? null, badge: badge ?? null, isFeatured, category: category ?? null, ctaText: ctaText ?? null });
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
  return { ok: true };
}

export async function deleteCodeAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const parsed = parseFormData(formData, DeleteByIdSchema);
  if (!parsed.ok) return;
  await deleteCode(parsed.data.id);
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
}
