'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, assertCanDelete } from '@/lib/permissions';
import { RevokeTalentInput, type RevokeTalentResult } from '@/lib/schemas/revokeTalent';
import { revokeTalentProfile } from '@/lib/queries/revokeTalent';

export async function revokeTalentAction(input: unknown): Promise<RevokeTalentResult> {
  const session = await requirePermission('talentos', 'delete');
  assertCanDelete(session.user.role);
  const parsed = RevokeTalentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Completa las dos confirmaciones antes de continuar.' };
  try {
    const result = await revokeTalentProfile(parsed.data, session.user.id);
    if (!result.ok) return result;
    for (const path of ['/admin/talents', '/talentos', '/en/talents', '/codigos', '/sorteos', '/sitemap.xml', '/news/live', '/',
      `/admin/talents/${parsed.data.id}`, `/talentos/${result.slug}`, `/${result.slug}`]) revalidatePath(path);
    return result;
  } catch {
    return { ok: false, error: 'No se pudo completar la acción. Si el perfil tiene registros vinculados, utiliza Archivar perfil.' };
  }
}
