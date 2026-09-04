'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { createCode, deleteCode, updateCode } from '@/lib/queries/creatorCodes';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { creatorCodes } from '@/db/schema';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { StrictIdSchema, StrictBooleanSchema } from '@/lib/schemas/common';
import { resolveCreatorCodeRedirectUrl } from '@/lib/utils/cta-url';
import {
  CreateCodeFormSchema,
  DeleteByIdSchema,
  UpdateCodeFormSchema,
} from '@/lib/schemas/giveaway';

const ToggleArgsSchema = z.tuple([StrictIdSchema, StrictBooleanSchema]);

export type CodeActionState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> };

function revalidateAll(talentSlug?: string, talentId?: number): void {
  revalidatePath('/admin/giveaways');
  revalidatePath('/codigos');
  if (talentSlug) {
    revalidatePath(`/talentos/${talentSlug}`);
    revalidatePath(`/creadores/${talentSlug}`);
    revalidatePath(`/${talentSlug}`);
  }
  if (talentId) {
    revalidatePath(`/admin/talents/${talentId}`);
  }
}

export async function createCodeAction(formData: FormData): Promise<CodeActionState> {
  await requirePermission('sorteos', 'write');

  const normalizedFormData = new FormData();
  for (const [key, value] of formData.entries()) normalizedFormData.append(key, value);
  normalizedFormData.set(
    'redirectUrl',
    resolveCreatorCodeRedirectUrl(
      String(formData.get('brandName') ?? ''),
      String(formData.get('code') ?? ''),
      String(formData.get('redirectUrl') ?? ''),
    ),
  );

  const parsed = parseFormData(normalizedFormData, CreateCodeFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createCodeAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { talentId, talentSlug, code, brandName, brandLogo, redirectUrl, description, badge, isFeatured, category, ctaText, crmBrandId } = parsed.data;

  try {
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
      crmBrandId:  crmBrandId  ?? null,
    });
  } catch (error) {
    logRedacted('error', '[createCodeAction] persistence failed:', error instanceof Error ? error.name : 'UnknownError');
    return {
      ok: false,
      fieldErrors: { form: ['No se pudo guardar el código. Vuelve a intentarlo.'] },
    };
  }

  revalidateAll(talentSlug, talentId);
  return { ok: true };
}

export async function updateCodeAction(formData: FormData): Promise<CodeActionState> {
  await requirePermission('sorteos', 'write');

  const parsed = parseFormData(formData, UpdateCodeFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[updateCodeAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const { id, talentId, talentSlug, code, brandName, brandLogo, redirectUrl, description, badge, isFeatured, category, ctaText, crmBrandId } = parsed.data;

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
    crmBrandId:  crmBrandId  ?? null,
  });

  revalidateAll(talentSlug, talentId);
  return { ok: true };
}

export async function setCodeFeaturedAction(id: number, value: boolean): Promise<void> {
  await requirePermission('sorteos', 'write');
  const parsed = ToggleArgsSchema.safeParse([id, value]);
  if (!parsed.success) return;
  const [pid, pval] = parsed.data;
  await db.update(creatorCodes).set({ isFeatured: pval }).where(eq(creatorCodes.id, pid));
  revalidatePath('/admin/giveaways');
  revalidatePath('/codigos');
  revalidatePath('/');
}

/**
 * Toggle `is_hidden` de un código — soft-hide para pausar sin borrar.
 * Cuando `value = true` desaparece de todas las páginas públicas; cuando
 * vuelve a `false` reaparece con toda su config y clicks históricos intactos.
 */
export async function setCodeHiddenAction(id: number, value: boolean): Promise<void> {
  await requirePermission('sorteos', 'write');
  const parsed = ToggleArgsSchema.safeParse([id, value]);
  if (!parsed.success) return;
  const [pid, pval] = parsed.data;

  // Resolvemos el talent para revalidar las rutas del creador afectado.
  const [row] = await db
    .select({ talentId: creatorCodes.talentId })
    .from(creatorCodes)
    .where(eq(creatorCodes.id, pid))
    .limit(1);

  await db.update(creatorCodes).set({ isHidden: pval }).where(eq(creatorCodes.id, pid));

  revalidatePath('/admin/giveaways');
  revalidatePath('/codigos');
  revalidatePath('/');
  if (row?.talentId) {
    revalidatePath(`/admin/talents/${row.talentId}`);
  }
}

export async function deleteCodeAction(formData: FormData): Promise<void> {
  await requirePermission('codigos', 'delete');
  const parsed = parseFormData(formData, DeleteByIdSchema);
  if (!parsed.ok) return;
  await deleteCode(parsed.data.id);
  revalidateAll(parsed.data.talentSlug);
}
