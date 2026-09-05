'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { creatorSearchProfileSchema, creatorFeedbackSchema, creatorSearchProfileIdentitySchema, creatorSearchProfileIdSchema } from '@/lib/schemas/creator-search-profile';
import { saveCreatorSearchProfile, recordCreatorFeedback } from '@/lib/queries/creatorSearchProfiles';
import { getCreatorProviderReadiness, recordCreatorPreflight } from '@/lib/queries/creatorProviderReadiness';
import { runCreatorSearchProfile } from '@/lib/services/creatorSearchProfiles';

export type CreatorProfileActionResult = Readonly<{ ok: boolean; error: string | null }>;

export async function saveSearchProfileAction(
  input: unknown, identity?: { id: number; version: number },
): Promise<CreatorProfileActionResult> {
  const session = await requirePermission('targets', 'write');
  const parsed = creatorSearchProfileSchema.safeParse(input);
  const id = creatorSearchProfileIdentitySchema.optional().safeParse(identity);
  if (!parsed.success || !id.success) return { ok: false, error: 'Revisa los campos del perfil.' };
  if (parsed.data.enabled) {
    const gates = await getCreatorProviderReadiness();
    if (!gates.some((gate) => gate.ready && parsed.data.platforms.includes(gate.platform))) {
      return { ok: false, error: 'Guarda el perfil pausado: antes de activarlo falta verificar conexión y permiso de uso de al menos una plataforma.' };
    }
  }
  try {
    await saveCreatorSearchProfile(parsed.data, session.user.id, id.data);
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.message === 'creator_profile_changed_reload'
      ? 'Otro usuario modificó el perfil. Recarga antes de guardar.' : 'No se pudo guardar. Comprueba que el nombre no esté repetido y vuelve a cargar.' };
  }
  revalidatePath('/admin/targets');
  return { ok: true, error: null };
}

export async function updateCreatorFeedbackAction(input: unknown): Promise<CreatorProfileActionResult> {
  const session = await requirePermission('targets', 'write');
  const parsed = creatorFeedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Selecciona un motivo válido para el cambio de estado.' };
  try { await recordCreatorFeedback(parsed.data, session.user.id); }
  catch { return { ok: false, error: 'No se guardó el cambio de estado. Recarga el listado.' }; }
  revalidatePath('/admin/targets');
  return { ok: true, error: null };
}

export async function runSearchProfileAction(id: number): Promise<CreatorProfileActionResult> {
  await requirePermission('targets', 'write');
  if (!creatorSearchProfileIdSchema.safeParse(id).success) return { ok: false, error: 'Perfil no válido.' };
  const gates = await getCreatorProviderReadiness();
  await recordCreatorPreflight(gates);
  const result = await runCreatorSearchProfile(id, 'manual');
  revalidatePath('/admin/targets');
  return result;
}
