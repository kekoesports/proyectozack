'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LivePlayer } from './LivePlayer';
import { LiveCard } from './LiveCard';
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

// Derivar badge de juego a partir del campo game
function gameBadge(game: string): string {
  const g = game.toLowerCase();
  if (g.includes('cs2') || g.includes('counter')) return 'CS2';
  if (g.includes('valorant')) return 'Valorant';
  if (g.includes('variety') || g.includes('varios') || g.includes('general')) return 'Variety';
  if (g.includes('fortnite')) return 'Fortnite';
  if (g.includes('lol') || g.includes('league')) return 'LoL';
  return game.split(' ')[0] ?? game; // primera palabra del juego
}

// ── RosterSidebar — columna derecha ─────────────────────────────────────

const SIDEBAR_MAX = 10;

function RosterSidebar({ roster, featuredId }: { roster: TwitchRosterEntry[]; featuredId?: number }) {
  const visible = roster.slice(0, SIDEBAR_MAX);
  return (
    <div className="border border-white/[0.07] rounded-xl p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25 mb-2 px-1">
        En Twitch
      </p>
      <div className="space-y-0.5">
        {visible.map((entry) => {
          const href = entry.streamUrl ?? `https://www.twitch.tv/${entry.handle}`;
          const isExternal = true;
          const isFeatured = entry.talentId === featuredId;
          return (
            <Link
              key={entry.talentId}
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`group flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                isFeatured ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
              }`}
            >
              <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 bg-white/10">
                {entry.photoUrl ? (
                  <Image src={entry.photoUrl} alt={entry.name} fill className="object-cover" sizes="28px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-white/40">
                    {entry.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                {entry.isLive && (
                  <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500 border border-sp-black" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${entry.isLive ? 'text-white' : 'text-white/45'}`}>
                  {entry.name}
                </p>
                {entry.isLive && entry.gameName && (
                  <p className="text-[10px] text-white/30 truncate">{entry.gameName}</p>
                )}
              </div>
              {entry.isLive && entry.viewerCount != null ? (
                <span className="text-[10px] font-bold text-red-400 shrink-0">{formatViewers(entry.viewerCount)}</span>
              ) : entry.isLive ? (
                <span className="text-[10px] font-bold text-red-400 shrink-0">LIVE</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const SP_GRAD = 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)';

// ── StreamerCard — fallback grid cuando nadie está live ─────────────────

function StreamerCard({ entry }: { entry: TwitchRosterEntry }) {
  const badge = gameBadge(entry.game);
  const href = entry.streamUrl ?? `https://www.twitch.tv/${entry.handle}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all text-center"
    >
      {/* Avatar con ring gradiente */}
      <div className="p-[2px] rounded-full shrink-0" style={{ background: SP_GRAD }}>
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-sp-black">
          {entry.photoUrl ? (
            <Image src={entry.photoUrl} alt={entry.name} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-black text-white/30">
              {entry.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Nombre con gradiente en hover */}
      <p
        className="text-xs font-black uppercase tracking-wider line-clamp-1 w-full transition-all text-white/70 group-hover:text-white"
      >
        {entry.name}
      </p>

      {/* Badges */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/[0.07] text-white/45">
          {badge}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#9146FF]/15 text-[#9146FF]">
          Twitch
        </span>
      </div>
    </a>
  );
}

// ── LiveSection principal ────────────────────────────────────────────────

export function LiveSection() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/live');
      if (!res.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = await res.json() as LiveData;
      setData(json);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(() => { void fetchLive(); }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchLive]);

  if (loading) return (
    <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]" aria-hidden>
      <div className="max-w-5xl mx-auto h-48 rounded-xl bg-white/[0.02] animate-pulse" />
    </section>
  );
  if (!data || data.roster.length === 0) return null;

  const { featured, others, roster, total } = data;
  const isLiveNow = total > 0;

  // ── Estado 1: Hay live ───────────────────────────────────────────────
  if (isLiveNow && featured) {
    return (
      <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
              En directo ahora
            </h2>
            <span className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">
              {total} {total === 1 ? 'streamer activo' : 'streamers activos'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
            {/* Featured */}
            <div className="space-y-3">
              <LivePlayer featured={featured} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-black uppercase text-white">{featured.name}</p>
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
              {others.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {others.map((l) => <LiveCard key={l.talentId} talent={l} />)}
                </div>
              )}
            </div>

            {/* Roster sidebar */}
            <RosterSidebar roster={roster} featuredId={featured.talentId} />
          </div>
        </div>
      </section>
    );
  }

  // ── Estado 2: Nadie live — fallback compacto ─────────────────────────
  // Si hay selección manual en CRM (featuredFallback=true), usarla.
  // Si no, mostrar los primeros 6 del roster.
  const manualFallback = roster.filter((e) => e.featuredFallback);
  const fallbackCards = manualFallback.length > 0 ? manualFallback.slice(0, 10) : roster.slice(0, 6);

  return (
    <section className="bg-sp-black py-14 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-8 items-start">

          {/* Centro — grid de streamers */}
          <div>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-white/20" />
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/30">
                  Offline ahora
                </p>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-white leading-tight">
                Nuestros creadores
              </h2>
              <p className="text-sm text-white/35 mt-1">
                Sin directos activos — sigue a nuestros creadores para no perderte nada
              </p>
            </div>

            {/* Grid de cards compactas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {fallbackCards.map((entry) => (
                <StreamerCard key={entry.talentId} entry={entry} />
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/talentos"
                className="px-5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Ver todos los talentos →
              </Link>
              <Link
                href="/giveaways"
                className="px-5 py-2 rounded-full border border-white/10 hover:border-white/25 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Sorteos y códigos
              </Link>
            </div>
          </div>

          {/* Sidebar — lista compacta */}
          <RosterSidebar roster={roster} />
        </div>

      </div>
    </section>
  );
}
