'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { LivePlayer } from './LivePlayer';
import { LiveCard } from './LiveCard';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import type { LiveTalent, TwitchRosterEntry } from '@/lib/queries/live';

type LiveData = {
  featured: LiveTalent | null;
  others: LiveTalent[];
  roster: TwitchRosterEntry[];
  total: number;
};

const REFRESH_MS = 120_000;

function formatViewers(n: number | null): string {
  if (!n) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function RosterCard({ entry }: { entry: TwitchRosterEntry }) {
  const href = entry.streamUrl ?? `https://www.twitch.tv/${entry.handle}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
    >
      {/* Avatar */}
      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/10">
        {entry.photoUrl ? (
          <Image src={entry.photoUrl} alt={entry.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
            {entry.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        {entry.isLive && (
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-red-500 border border-sp-black" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${entry.isLive ? 'text-white' : 'text-white/50'}`}>
          {entry.name}
        </p>
        {entry.isLive && entry.gameName && (
          <p className="text-[10px] text-white/35 truncate">{entry.gameName}</p>
        )}
      </div>

      {/* Viewers o indicador live */}
      {entry.isLive && entry.viewerCount != null ? (
        <span className="text-[10px] font-bold text-red-400 shrink-0">{formatViewers(entry.viewerCount)}</span>
      ) : entry.isLive ? (
        <span className="text-[10px] font-bold text-red-400 shrink-0">LIVE</span>
      ) : null}
    </a>
  );
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
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchLive]);

  if (loading) return null;
  // Mostrar sección si hay alguien live O si hay roster de Twitch
  if (!data || (data.total === 0 && data.roster.length === 0)) return null;

  const { featured, others, roster } = data;

  return (
    <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {data.total > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
            {data.total > 0 ? 'En directo ahora' : 'Nuestros streamers'}
          </h2>
          {data.total > 0 && (
            <span className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">
              {data.total} {data.total === 1 ? 'streamer' : 'streamers'} activo{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">

          {/* Columna izquierda: featured player o lista de otros live */}
          <div>
            {featured ? (
              <div className="space-y-3">
                <LivePlayer featured={featured} />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-black uppercase text-white leading-tight">
                      {featured.name}
                    </p>
                    {featured.streamTitle && (
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{featured.streamTitle}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {featured.gameName && <span className="text-xs text-white/35">{featured.gameName}</span>}
                      {featured.viewerCount != null && featured.viewerCount > 0 && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-xs font-bold text-red-400">{formatViewers(featured.viewerCount)} espectadores</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Otros live debajo del featured */}
                {others.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {others.map((l) => (
                      <LiveCard key={l.talentId} talent={l} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* No hay nadie live — mostrar mensaje */
              <div className="flex items-center justify-center h-full min-h-[120px]">
                <p className="text-white/30 text-sm">Ningún streamer en directo ahora mismo</p>
              </div>
            )}
          </div>

          {/* Columna derecha: roster completo Twitch */}
          {roster.length > 0 && (
            <div className="border border-white/[0.07] rounded-xl p-3 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25 mb-2 px-2">
                En Twitch
              </p>
              {roster.map((entry) => (
                <RosterCard key={entry.talentId} entry={entry} />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
