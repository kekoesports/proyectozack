import { requireCreator } from '@/lib/studio/access';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { createChannelRepository } from '@/lib/studio/channel-repository';
import { StudioShell } from '@/features/studio/StudioShell';
import { StudioConnection } from '@/features/studio/StudioConnection';
const platforms = ['instagram', 'tiktok', 'youtube', 'twitch', 'x'] as const;
export default async function ConnectionsPage() {
  const { member, session } = await requireCreator();
  const channels = await createChannelRepository(db, session.user.id).list();
  return <StudioShell name={member.name} active="/studio/connections"><p className="studio-eyebrow">IDENTIDAD / FUENTES / PERMISOS</p>
    <h1 className="studio-page-title">Tus redes. Un mismo lugar.</h1><p className="studio-lead">Primero identificamos el perfil. Después verificamos las fuentes. Las estadísticas siempre conservan su fecha y su significado.</p>
    <div className="studio-connections-grid">{platforms.map((platform) => {
      const channel = channels.find((c) => c.platform === platform);
      return <StudioConnection key={`${platform}:${channel?.handle}`} platform={platform} youtubeReady={Boolean(env.YOUTUBE_API_KEY)} channel={channel ? { id: channel.id, handle: channel.handle, url: channel.url, syncedAt: channel.observations[0]?.collectedAt ?? null } : null} />;
    })}</div><section className="studio-panel"><h2>Lectura no significa publicación.</h2><p>Vincular una cuenta para consultar métricas no autoriza publicar vídeos, mensajes o campañas. Las conexiones de publicación tendrán su propio consentimiento y revisión.</p></section>
  </StudioShell>;
}
