'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { createCode, deleteCode, updateCode } from '@/lib/queries/creatorCodes';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import {
  CreateCodeFormSchema,
  DeleteByIdSchema,
  UpdateCodeFormSchema,
} from '@/lib/schemas/giveaway';

export type CodeActionState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> };

function revalidateAll(talentSlug?: string): void {
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
  if (talentSlug) {
    revalidatePath(`/creadores/${talentSlug}`);
    revalidatePath(`/${talentSlug}`);
  }
}

export async function createCodeAction(formData: FormData): Promise<CodeActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, CreateCodeFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createCodeAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { talentId, talentSlug, code, brandName, brandLogo, redirectUrl, description, badge, isFeatured, category, ctaText } = parsed.data;

  await createCode({
    talentId,
    code,
    brandName,
    brandLogo:   brandLogo   ?? null,
    redirectUrl,
    description: description ?? null,
    badge:       badge       ?? null,
    isFeatured,
    category:    category    ?? null,
    ctaText:     ctaText     ?? null,
  });

  revalidateAll(talentSlug);
  return { ok: true };
}

export async function updateCodeAction(formData: FormData): Promise<CodeActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, UpdateCodeFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[updateCodeAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { id, talentId, talentSlug, code, brandName, brandLogo, redirectUrl, description, badge, isFeatured, category, ctaText } = parsed.data;

  await updateCode(id, {
    talentId,
    code,
    brandName,
    brandLogo:   brandLogo   ?? null,
    redirectUrl,
    description: description ?? null,
    badge:       badge       ?? null,
    isFeatured,
    category:    category    ?? null,
    ctaText:     ctaText     ?? null,
  });

  revalidateAll(talentSlug);
  return { ok: true };
}

export async function deleteCodeAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = parseFormData(formData, DeleteByIdSchema);
  if (!parsed.ok) return;
  await deleteCode(parsed.data.id);
  revalidateAll(parsed.data.talentSlug);
}
