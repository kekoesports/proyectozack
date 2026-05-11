import Link from 'next/link';
import type { PostWithTalents } from '@/lib/queries/posts';
import type { InferSelectModel } from 'drizzle-orm';
import type { rankingEntries } from '@/db/schema';
import { deriveNewsCategory, formatNewsDate } from '@/lib/utils/news';
import { SorteosCtaCard } from './SorteosCtaCard';

type RankingEntry = InferSelectModel<typeof rankingEntries>;

type MatchMeta = {
  team1?: string;
  team2?: string;
  tournament?: string;
  matchDate?: string;
  matchTime?: string;
};

type Props = {
  readonly latestPosts: readonly PostWithTalents[];
  readonly featuredMatch: MatchMeta | null;
  readonly ranking: readonly RankingEntry[];
};

function formatMatchDate(dateStr?: string, timeStr?: string) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T${timeStr ?? '00:00'}`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export function NewsHubSidebar({ latestPosts, featuredMatch, ranking }: Props) {
  const ultimaHora = latestPosts.slice(0, 5);
  const hasMatch = !!(featuredMatch?.team1 && featuredMatch?.team2);

  return (
    <aside className="flex flex-col gap-3 min-w-0">

      {/* Última hora */}
      <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sp-orange animate-pulse shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Última hora</p>
          </div>
          <Link href="/news" className="text-[9px] text-white/30 hover:text-white/60 transition-colors">
            VER TODAS →
          </Link>
        </div>
        <ul>
          {ultimaHora.length === 0 ? (
            <li className="px-3 py-2.5 text-[10px] text-white/30">Sin novedades.</li>
          ) : (
            ultimaHora.map((p, i) => {
              const cat = deriveNewsCategory(p.slug, p.title);
              return (
                <li key={p.slug} className={i > 0 ? 'border-t border-white/[0.04]' : ''}>
                  <Link
                    href={`/news/${p.slug}`}
                    className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors group"
                  >
                    <span className={`text-[8px] font-black uppercase tracking-wider mt-0.5 shrink-0 px-1.5 py-0.5 rounded ${cat.bg} ${cat.text}`}>
                      {cat.label.slice(0, 4)}
                    </span>
                    <p className="text-[11px] text-white/70 group-hover:text-white transition-colors line-clamp-2 leading-snug flex-1">
                      {p.title}
                    </p>
                    <span className="text-[9px] text-white/25 tabular-nums shrink-0 mt-0.5">
                      {formatNewsDate(p.publishedAt)}
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Partido destacado */}
      {hasMatch && (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-sp-orange">Partido destacado</p>
            {featuredMatch.tournament && (
              <p className="text-[9px] text-white/30 uppercase tracking-wider truncate ml-2">{featuredMatch.tournament}</p>
            )}
          </div>
          <div className="px-3 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-black uppercase text-white text-sm tracking-tight text-center flex-1 leading-tight">{featuredMatch.team1}</p>
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">VS</span>
                {featuredMatch.matchTime && (
                  <span className="text-[10px] font-mono text-white/60 font-bold">{featuredMatch.matchTime}</span>
                )}
              </div>
              <p className="font-display font-black uppercase text-white text-sm tracking-tight text-center flex-1 leading-tight">{featuredMatch.team2}</p>
            </div>
            {featuredMatch.matchDate && (
              <p className="text-[9px] text-white/30 text-center mt-2 font-mono uppercase tracking-wider">
                {formatMatchDate(featuredMatch.matchDate, featuredMatch.matchTime)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ranking hispano */}
      {ranking.length > 0 && (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Ranking Hispano</p>
          </div>
          <ul>
            {ranking.map((e, i) => (
              <li key={e.id} className={i > 0 ? 'border-t border-white/[0.04]' : ''}>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="font-display font-black text-sm tabular-nums w-4 shrink-0"
                    style={{ color: i === 0 ? '#f5632a' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.35)' }}>
                    {e.position}
                  </span>
                  <p className="flex-1 text-[11px] font-bold text-white/80 truncate uppercase tracking-wide">{e.teamName}</p>
                  {e.country && (
                    <span className="text-[9px] text-white/30 uppercase tracking-wider shrink-0">{e.country}</span>
                  )}
                  <span className="text-[10px] text-white/40 tabular-nums shrink-0 font-mono">
                    {e.points.toLocaleString('es-ES')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sorteos activos */}
      <SorteosCtaCard tone="dark" />

    </aside>
  );
}
