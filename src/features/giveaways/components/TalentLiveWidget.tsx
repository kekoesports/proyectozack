'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { TalentLiveData } from '@/app/api/live/[slug]/route';

type Props = {
  slug: string;
  talentName: string;
  talentPhotoUrl: string | null;
  gradientC1: string;
  gradientC2: string;
  /** 'sidebar' = columna derecha desktop | 'strip' = franja mobile */
  variant?: 'sidebar' | 'strip';
};

const REFRESH_MS = 120_000;
const TWITCH_PARENTS = ['socialpro.es', 'www.socialpro.es', 'localhost'];

function formatViewers(n: number | null): string {
  if (!n) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ── Embed player (mismo patrón que LivePlayer) ──────────────────────────

function EmbedPlayer({ data, talentName }: { data: TalentLiveData; talentName: string }) {
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

  const isYouTube  = data.platform === 'youtube';
  const parentStr  = TWITCH_PARENTS.map((p) => `parent=${p}`).join('&');
  const embedSrc   = isYouTube
    ? `https://www.youtube.com/embed/${data.liveVideoId}?autoplay=1&mute=1`
    : `https://player.twitch.tv/?channel=${data.handle}&${parentStr}&autoplay=true&muted=true`;
  const platformLabel = isYouTube ? 'YouTube' : 'Twitch';
  const platformColor = isYouTube ? 'bg-red-600' : 'bg-[#9146FF]';

  return (
    <div ref={wrapperRef} className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60">
      {/* Thumbnail de fondo */}
      {data.thumbnailUrl && (
        <Image
          src={data.thumbnailUrl}
          alt={`${talentName} en directo`}
          fill
          className="object-cover"
          unoptimized
        />
      )}
      {/* Overlay mientras no está en viewport */}
      {!inView && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-lg">▶</span>
          </div>
        </div>
      )}
      {/* Iframe lazy */}
      {inView && (
        <iframe
          src={embedSrc}
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen"
          title={`${talentName} en directo en ${platformLabel}`}
        />
      )}
      {/* Botón siempre visible */}
      {data.streamUrl && (
        <a
          href={data.streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`absolute bottom-2 right-2 z-10 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-wider ${platformColor}`}
        >
          Abrir ↗
        </a>
      )}
    </div>
  );
}

// ── Widget principal ────────────────────────────────────────────────────

export function TalentLiveWidget({
  slug,
  talentName,
  talentPhotoUrl,
  gradientC1,
  gradientC2,
  variant = 'sidebar',
}: Props) {
  const [data, setData] = useState<TalentLiveData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${slug}`);
      if (!res.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = await res.json() as TalentLiveData;
      setData(json);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => { void fetchStatus(); }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) return null;
  if (!data) return null;

  const twitchUrl = data.streamUrl ?? (data.handle ? `https://www.twitch.tv/${data.handle}` : null);
  const channelUrl = data.profileUrl ?? twitchUrl;

  // ── STRIP (mobile) — solo si está live ─────────────────────────────
  if (variant === 'strip') {
    if (!data.isLive || !twitchUrl) return null;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 mb-6">
        {data.thumbnailUrl && (
          <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-black/40">
            <Image src={data.thumbnailUrl} alt="" fill sizes="80px" className="object-cover" unoptimized />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400">En directo</span>
            {data.viewerCount != null && (
              <span className="text-[10px] text-white/30">· {formatViewers(data.viewerCount)}</span>
            )}
          </div>
          <p className="text-xs text-white/60 truncate">{data.gameName ?? data.streamTitle ?? 'Streaming ahora'}</p>
        </div>
        <a
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-[#9146FF] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#7d2fe0] transition-colors"
        >
          Ver →
        </a>
      </div>
    );
  }

  // ── SIDEBAR (desktop) ───────────────────────────────────────────────
  if (data.isLive) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#070707] overflow-hidden">
        {/* Header LIVE */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]"
          style={{ background: `linear-gradient(90deg, ${gradientC1}15, transparent)` }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80">En directo</span>
          </div>
          {data.viewerCount != null && data.viewerCount > 0 && (
            <span className="text-[10px] font-bold text-white/40">{formatViewers(data.viewerCount)} viewers</span>
          )}
        </div>

        {/* Embed / thumbnail */}
        <div className="p-2">
          <EmbedPlayer data={data} talentName={talentName} />
        </div>

        {/* Info + CTA */}
        <div className="px-3 pb-3 space-y-2">
          {(data.gameName ?? data.streamTitle) && (
            <p className="text-[11px] text-white/50 line-clamp-2">
              {data.gameName && <span className="font-bold text-white/70">{data.gameName}</span>}
              {data.gameName && data.streamTitle && ' · '}
              {data.streamTitle}
            </p>
          )}
          {twitchUrl && (
            <a
              href={twitchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full py-2 rounded-lg bg-[#9146FF] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#7d2fe0] transition-colors"
            >
              Ver en Twitch →
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── SIDEBAR offline ─────────────────────────────────────────────────
  if (!channelUrl) return null; // sin canal configurado → no mostrar nada

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2.5 mb-2.5">
        {/* Avatar */}
        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/10">
          {talentPhotoUrl ? (
            <Image src={talentPhotoUrl} alt={talentName} fill className="object-cover" sizes="32px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-white/30">
              {talentName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold text-white/60">{talentName}</p>
          <p className="text-[10px] text-white/25">Ahora no está en directo</p>
        </div>
      </div>
      <a
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-full py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 text-[10px] font-bold uppercase tracking-wider transition-colors"
      >
        Seguir canal →
      </a>
    </div>
  );
}
