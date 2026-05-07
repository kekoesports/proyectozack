'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { LiveTalent } from '@/lib/queries/live';

type Props = { featured: LiveTalent };

const TWITCH_PARENTS = ['socialpro.es', 'www.socialpro.es', 'localhost'];

export function LivePlayer({ featured }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

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

  const isYouTube = featured.platform === 'youtube';
  const parentParams = TWITCH_PARENTS.map((p) => `parent=${p}`).join('&');
  const embedSrc = isYouTube
    ? `https://www.youtube.com/embed/${featured.liveVideoId}?autoplay=1&mute=1&enablejsapi=1`
    : `https://player.twitch.tv/?channel=${featured.handle}&${parentParams}&autoplay=true&muted=true`;
  const streamUrl = featured.streamUrl
    ?? (isYouTube ? `https://www.youtube.com/@${featured.handle}` : `https://www.twitch.tv/${featured.handle}`);
  const platformLabel = isYouTube ? 'YouTube' : 'Twitch';
  const platformBg   = isYouTube ? 'bg-red-600 hover:bg-red-700' : 'bg-[#9146FF] hover:bg-[#7d2fe0]';

  return (
    <div ref={wrapperRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      {/* Thumbnail mientras no está en viewport */}
      {!inView && featured.thumbnailUrl && (
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
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-2xl">▶</span>
          </div>
        </div>
      )}

      {/* Iframe — carga cuando entra en viewport, Twitch/YouTube gestionan el autoplay */}
      {inView && (
        <iframe
          src={embedSrc}
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen"
          title={`${featured.name} en directo en ${platformLabel}`}
        />
      )}

      {/* Botón "Ver en directo" en esquina inferior derecha — siempre visible */}
      <a
        href={streamUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`absolute bottom-3 right-3 z-10 px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider transition-colors ${platformBg} shadow-lg`}
      >
        Abrir en {platformLabel} ↗
      </a>
    </div>
  );
}
