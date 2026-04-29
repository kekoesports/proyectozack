'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { updateTalentBusinessSchema } from '@/lib/schemas/talentBusiness';
import { upsertTalentBusiness, setTalentVerticals } from '@/lib/queries/talentBusiness';
import { compact } from '@/lib/utils/objects';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
};

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (key === 'verticals') {
      const arr = (obj.verticals as string[] | undefined) ?? [];
      arr.push(String(value));
      obj.verticals = arr;
    } else {
      obj[key] = value;
    }
  }
  return obj;
}


export async function updateTalentBusinessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole('admin', '/admin/login');

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
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] updateTalentBusiness error:', msg);
    return { error: 'Error al guardar' };
  }
}
