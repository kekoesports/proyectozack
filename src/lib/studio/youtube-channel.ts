import 'server-only';
import { z } from 'zod';
import { env } from '@/lib/env';
import { StudioObservation } from '@/lib/schemas/studio-production';

const counter = z.string().regex(/^\d{1,16}$/).transform(Number).pipe(z.number().int().nonnegative().safe());
const responseSchema = z.object({ items: z.array(z.object({
  id: z.string().regex(/^UC[A-Za-z0-9_-]{22}$/),
  snippet: z.object({ title: z.string().max(160), customUrl: z.string() }),
  statistics: z.object({ subscriberCount: counter.optional(), hiddenSubscriberCount: z.boolean(), viewCount: counter.optional(), videoCount: counter.optional() }),
})).max(1) });

export async function readYouTubeChannel(handle: string) {
  if (!env.YOUTUBE_API_KEY) return { ok: false as const, error: 'Falta la clave de YouTube Data API del servidor. El perfil permanece indicado, sin métricas inventadas.' };
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.search = new URLSearchParams({ part: 'snippet,statistics', forHandle: handle, key: env.YOUTUBE_API_KEY }).toString();
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) return { ok: false as const, error: 'YouTube no permitió sincronizar. Revisa permisos o cuota con la agencia.' };
    const parsed = responseSchema.safeParse(await response.json());
    const item = parsed.success ? parsed.data.items[0] : null;
    if (!item || item.snippet.customUrl.replace(/^@/, '').toLowerCase() !== handle.toLowerCase()) return { ok: false as const, error: 'No se pudo verificar ese identificador exacto de YouTube.' };
    const document = StudioObservation.safeParse({ source: 'youtube_data_api', providerId: item.id,
      title: item.snippet.title, sourceUrl: `https://www.youtube.com/channel/${item.id}`,
      followers: item.statistics.hiddenSubscriberCount ? null : item.statistics.subscriberCount ?? null,
      lifetimeViews: item.statistics.viewCount ?? null, videos: item.statistics.videoCount ?? null, collectedAt: new Date().toISOString() });
    return document.success ? { ok: true as const, document: document.data } : { ok: false as const, error: 'YouTube devolvió datos no válidos.' };
  } catch { return { ok: false as const, error: 'No se pudo contactar con YouTube. Las cifras anteriores conservan su fecha.' }; }
}
