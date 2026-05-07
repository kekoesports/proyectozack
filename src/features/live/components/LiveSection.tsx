'use client';

import { useState, useEffect, useCallback } from 'react';
import { LivePlayer } from './LivePlayer';
import { LiveCard } from './LiveCard';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import type { LiveTalent } from '@/lib/queries/live';

type LiveData = {
  featured: LiveTalent | null;
  others: LiveTalent[];
  total: number;
};

const REFRESH_INTERVAL_MS = 120_000; // 2 min

function formatViewers(n: number | null): string {
  if (!n) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function LiveSection() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/live');
      if (!res.ok) return;
      const json: LiveData = await res.json();
      setData(json);
    } catch {
      // silently fail — don't break the page
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // No renderizar nada hasta tener datos (evita flash de "nadie en directo")
  if (loading) return null;
  if (!data || data.total === 0) return null;

  const { featured, others } = data;

  return (
    <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
            En directo ahora
          </h2>
          <span className="text-xs font-bold text-white/30 uppercase tracking-widest ml-2">
            {data.total} streamer{data.total !== 1 ? 's' : ''} activo{data.total !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* Columna izquierda: destacado */}
          {featured && (
            <div className="space-y-4">
              <LivePlayer featured={featured} />

              {/* Info del destacado */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-black uppercase text-white leading-tight">
                    {featured.name}
                  </p>
                  {featured.streamTitle && (
                    <p className="text-sm text-white/50 mt-0.5 line-clamp-1">{featured.streamTitle}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {featured.gameName && (
                      <span className="text-xs text-white/40">{featured.gameName}</span>
                    )}
                    {featured.viewerCount != null && featured.viewerCount > 0 && (
                      <>
                        <span className="text-white/20">·</span>
                        <span className="text-xs font-bold text-red-400">
                          {formatViewers(featured.viewerCount)} espectadores
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <TrackedCtaLink
                  href={featured.streamUrl ?? `https://www.twitch.tv/${featured.handle}`}
                  ctaId="live_featured_click"
                  className="shrink-0 px-5 py-2 rounded-full bg-[#9146FF] text-white text-xs font-black uppercase tracking-wider hover:bg-[#7d2fe0] transition-colors"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Ver directo →
                </TrackedCtaLink>
              </div>
            </div>
          )}

          {/* Columna derecha: lista de otros live */}
          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-3">
                También en directo
              </p>
              {others.map((talent) => (
                <LiveCard key={talent.talentId} talent={talent} />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
