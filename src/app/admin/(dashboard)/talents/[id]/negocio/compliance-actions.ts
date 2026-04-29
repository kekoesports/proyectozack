'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { updateTalentComplianceSchema } from '@/lib/schemas/talentCompliance';
import { updateTalentCompliance } from '@/lib/queries/talents';
import { compact } from '@/lib/utils/objects';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
};

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    obj[key] = value;
  }
  // Coerce checkbox: 'on' → true, absent → false
  if (!obj.hasRcInsurance) obj.hasRcInsurance = false;
  return obj;
}


export async function updateTalentComplianceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole('admin', '/admin/login');

  // hasRcInsurance is a checkbox — only present in FormData when checked
  const raw = formToObject(formData);

  const parsed = updateTalentComplianceSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { talentId, ...rest } = parsed.data;

  try {
    // Cast via compact to strip undefined and satisfy exactOptionalPropertyTypes
    await updateTalentCompliance(
      talentId,
      compact(rest as Record<string, unknown>) as Parameters<typeof updateTalentCompliance>[1],
    );
    revalidatePath(`/admin/talents/${talentId}`);
    revalidatePath('/admin/talents');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] updateTalentCompliance error:', msg);
    return { error: 'Error al guardar' };
  }
}
