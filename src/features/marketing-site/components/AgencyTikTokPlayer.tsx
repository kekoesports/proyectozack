'use client';

import { useEffect, useRef, useState } from 'react';
import { TikTokPlayerMessage, type AgencyVideo } from '@/lib/schemas/agencyVideo';

export function AgencyTikTokPlayer({ video, reducedMotion }: {
  readonly video: AgencyVideo;
  readonly reducedMotion: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);
  const [status, setStatus] = useState('Cargando vídeo…');
  const [failed, setFailed] = useState(false);

  // WHY: TikTok reports readiness/playback through its cross-origin message API.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setStatus('Si no se reproduce, ábrelo en TikTok');
    }, 12000);
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== 'https://www.tiktok.com' || event.source !== frame.current?.contentWindow) return;
      const parsed = TikTokPlayerMessage.safeParse(event.data);
      if (!parsed.success) return;
      const { type, value } = parsed.data;
      window.clearTimeout(timeout);
      if (type === 'onPlayerReady') setStatus(muted ? 'Listo · Sin sonido' : 'Listo');
      if (type === 'onStateChange' && typeof value === 'number') {
        setStatus(value === 1 ? (muted ? 'Reproduciendo · Sin sonido' : 'Reproduciendo') : 'En pausa');
      }
      if (type === 'onPlayerError') {
        const autoplayBlocked = typeof value === 'object' && value?.errorCode === 3002;
        setStatus(autoplayBlocked ? 'Pulsa reproducir en el vídeo' : 'Vídeo no disponible · Ábrelo en TikTok');
        if (!autoplayBlocked) setFailed(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };
  }, [muted]);

  return (
    <>
      <div className="sp-player-host">
        {!failed && <iframe
          ref={frame}
          title={`${video.title} · SocialPro en TikTok`}
          src={`https://www.tiktok.com/player/v1/${video.id}?autoplay=${reducedMotion ? 0 : 1}&muted=${muted ? 1 : 0}&controls=1&loop=1&description=0&music_info=0&rel=0`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
        />}
        {failed && <a className="sp-player-fallback" href={video.url} target="_blank" rel="noopener noreferrer">Ver vídeo en TikTok ↗</a>}
      </div>
      <div className="sp-video-controls">
        <p role="status">{status}</p>
        {!failed && <button type="button" onClick={() => setMuted(value => !value)}>
          {muted ? 'Activar sonido' : 'Silenciar'}
        </button>}
      </div>
    </>
  );
}
