'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { LiveTalent } from '@/lib/queries/live';

type Props = { featured: LiveTalent };

// Dominios permitidos para el embed de Twitch (parent param)
// Twitch rechaza el embed si el parent no coincide con el host real
const TWITCH_PARENTS = ['socialpro.es', 'www.socialpro.es', 'localhost'];

export function LivePlayer({ featured }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  // Cargar el iframe solo cuando la sección entra en viewport
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setInView(true); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fallback: si en 3s el iframe no ha reportado actividad, mostrar fallback
  useEffect(() => {
    if (!inView) return;
    const timer = setTimeout(() => setPlaybackFailed(true), 3000);
    const onMessage = (e: MessageEvent) => {
      // Twitch postMessage cuando el player está listo
      if (typeof e.data === 'object' && e.data?.eventName) clearTimeout(timer);
    };
    window.addEventListener('message', onMessage);
    return () => { clearTimeout(timer); window.removeEventListener('message', onMessage); };
  }, [inView]);

  const isYouTube = featured.platform === 'youtube';
  const parentParams = TWITCH_PARENTS.map((p) => `parent=${p}`).join('&');
  const embedSrc = isYouTube
    ? `https://www.youtube.com/embed/${featured.liveVideoId}?autoplay=1&mute=1&enablejsapi=1`
    : `https://player.twitch.tv/?channel=${featured.handle}&${parentParams}&autoplay=true&muted=true`;
  const fallbackUrl = featured.streamUrl
    ?? (isYouTube ? `https://www.youtube.com/@${featured.handle}` : `https://www.twitch.tv/${featured.handle}`);
  const platformLabel = isYouTube ? 'YouTube' : 'Twitch';
  const platformColor = isYouTube ? 'bg-red-600 hover:bg-red-700' : 'bg-[#9146FF] hover:bg-[#7d2fe0]';

  return (
    <div ref={wrapperRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      {/* Thumbnail de fondo */}
      {featured.thumbnailUrl && (
        <Image
          src={featured.thumbnailUrl}
          alt={`${featured.name} en directo`}
          fill
          className="object-cover"
          unoptimized
          priority
        />
      )}

      {!inView && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-3xl">▶</span>
          </div>
        </div>
      )}

      {inView && !playbackFailed && (
        <iframe
          src={embedSrc}
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen"
          title={`${featured.name} en directo en ${platformLabel}`}
        />
      )}

      {inView && playbackFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70">
          <p className="text-white/70 text-sm">Reproducción automática no disponible</p>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-6 py-2.5 rounded-full text-white text-sm font-bold uppercase tracking-wider transition-colors ${platformColor}`}
          >
            ▶ Ver en {platformLabel}
          </a>
        </div>
      )}
    </div>
  );
}
