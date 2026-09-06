'use server';
import { revalidatePath } from 'next/cache';
import { requireCreator } from '@/lib/studio/access';
import { db } from '@/lib/db';
import { StudioChannelInput } from '@/lib/schemas/studio-production';
import { StudioId } from '@/lib/schemas/studio';
import { createChannelRepository } from '@/lib/studio/channel-repository';
import { readYouTubeChannel } from '@/lib/studio/youtube-channel';

export async function declareStudioChannel(input: unknown) {
  const { session } = await requireCreator();
  const parsed = StudioChannelInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Introduce un usuario, no una URL ni una contraseña.' };
  try {
    const ok = await createChannelRepository(db, session.user.id).declare(parsed.data);
    revalidatePath('/studio/connections'); revalidatePath('/studio/stats');
    return { ok, error: ok ? '' : 'Tu acceso no está disponible.' };
  } catch { return { ok: false, error: 'No se pudo guardar el perfil.' }; }
}
export async function syncStudioYouTube(input: unknown) {
  const { session } = await requireCreator();
  const id = StudioId.safeParse(input);
  if (!id.success) return { ok: false, error: 'Canal no válido.' };
  try {
    const repository = createChannelRepository(db, session.user.id);
    const channel = (await repository.list()).find((c) => c.id === id.data && c.platform === 'youtube');
    if (!channel) return { ok: false, error: 'Canal no disponible.' };
    const last = channel.observations[0];
    if (last && Date.now() - new Date(last.collectedAt).getTime() < 3600000) return { ok: false, error: 'Ya se sincronizó durante la última hora. Conservamos la cuota de tu API.' };
    const result = await readYouTubeChannel(channel.handle);
    if (!result.ok) return result;
    const ok = await repository.record(channel.id, channel.handle, result.document);
    revalidatePath('/studio/connections'); revalidatePath('/studio/stats');
    return { ok, error: ok ? '' : 'El perfil cambió durante la consulta. No se importaron las cifras.' };
  } catch { return { ok: false, error: 'No se pudo guardar la sincronización.' }; }
}
