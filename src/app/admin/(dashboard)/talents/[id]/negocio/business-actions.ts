'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { updateTalentBusinessSchema } from '@/lib/schemas/talentBusiness';
import { upsertTalentBusiness, setTalentVerticals } from '@/lib/queries/talentBusiness';
import { compact } from '@/lib/utils/objects';
import { logRedacted } from '@/lib/log';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
};

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const verticals: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (key === 'verticals') verticals.push(String(value));
    else obj[key] = value;
  }
  if (verticals.length > 0) obj.verticals = verticals;
  return obj;
}


export async function updateTalentBusinessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission('talentos', 'delete');

  const parsed = updateTalentBusinessSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { talentId, verticals, ...rest } = parsed.data;

  try {
    await upsertTalentBusiness(talentId, compact(rest) as Parameters<typeof upsertTalentBusiness>[1]);
    await setTalentVerticals(talentId, verticals);
    revalidatePath(`/admin/talents/${talentId}/negocio`);
    revalidatePath('/admin/talents');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] updateTalentBusiness error:', err);
    return { error: 'Error al guardar' };
  }
}
