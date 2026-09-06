'use server';
import { revalidatePath } from 'next/cache';
import { requireCreator } from '@/lib/studio/access';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { StudioTransition } from '@/lib/schemas/studio';
import { createNarrationRepository } from '@/lib/studio/narration-repository';
export async function requestStudioNarration(input: unknown) {
  const { session } = await requireCreator();
  const parsed = StudioTransition.safeParse(input);
  if (!parsed.success || !env.STUDIO_HIGGSFIELD_ENABLED) return { ok: false, error: 'Conexión de voz no disponible en este entorno.' };
  try {
    const result = await createNarrationRepository(db, session.user.id).request(parsed.data.id, parsed.data.revision);
    if (!result) return { ok: false, error: 'Revisa la voz autorizada, la versión guardada y la longitud del guion (10–5000 caracteres).' };
    revalidatePath(`/studio/projects/${parsed.data.id}`); revalidatePath('/admin/studio');
    return { ok: true, error: '' };
  } catch { return { ok: false, error: 'No se confirmó la solicitud. Actualiza antes de repetir.' }; }
}
