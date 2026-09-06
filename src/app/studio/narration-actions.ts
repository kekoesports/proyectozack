'use server';
import { revalidatePath } from 'next/cache';
import { requireStudioWriter } from '@/lib/studio/access';
import { env } from '@/lib/env';
import { StudioTransition } from '@/lib/schemas/studio';
export async function requestStudioNarration(input: unknown, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return { ok: false, error: 'El espacio cambió. Actualiza antes de solicitar voz.' };
  const parsed = StudioTransition.safeParse(input);
  if (!parsed.success || !env.STUDIO_HIGGSFIELD_ENABLED) return { ok: false, error: 'Conexión de voz no disponible en este entorno.' };
  try {
    const result = await actor.narrations.request(parsed.data.id, parsed.data.revision);
    if (!result) return { ok: false, error: 'Revisa la voz autorizada, la versión guardada y la longitud del guion (10–5000 caracteres).' };
    revalidatePath(`/studio/projects/${parsed.data.id}`); revalidatePath('/admin/studio');
    return { ok: true, error: '' };
  } catch { return { ok: false, error: 'No se confirmó la solicitud. Actualiza antes de repetir.' }; }
}
