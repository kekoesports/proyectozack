import Link from 'next/link';
import type { PostWithTalents } from '@/lib/queries/posts';
import { formatNewsDate } from '@/lib/utils/news';
import { SorteosCtaCard } from './SorteosCtaCard';
import { CodigosCtaCard } from './CodigosCtaCard';

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
};

function formatMatchDate(dateStr?: string, timeStr?: string) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T${timeStr ?? '00:00'}`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + (timeStr ? ` · ${timeStr}` : '');
}

const divider = <div className="h-px bg-white/[0.06] mx-4" />;

export function NewsHubSidebar({ latestPosts, featuredMatch }: Props) {
  const ultimaHora = latestPosts.slice(0, 5);
  const hasMatch = !!(featuredMatch?.team1 && featuredMatch?.team2);

  return (
    <aside className="flex flex-col gap-5 min-w-0">
      {/* Última hora — contenedor unificado */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sp-orange animate-pulse shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white">Última hora</p>
          </div>
          <Link href="/news" className="text-[10px] text-white/35 hover:text-white/65 transition-colors shrink-0">
            Ver todas →
          </Link>
        </div>
        {divider}
        <ul>
          {ultimaHora.length === 0 ? (
            <li className="px-4 py-3 text-xs text-white/30">Sin novedades recientes.</li>
          ) : (
            ultimaHora.map((p, i) => (
              <li key={p.slug} className={i > 0 ? 'border-t border-white/[0.04]' : ''}>
                <Link
                  href={`/news/${p.slug}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                >
                  <span className="text-[10px] text-sp-orange/80 font-mono tabular-nums mt-0.5 shrink-0 w-10">
                    {formatNewsDate(p.publishedAt)}
                  </span>
                  <p className="text-[11px] text-white/75 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {p.title}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Partido destacado */}
      {hasMatch ? (
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange">Partido destacado</p>
          </div>
          {featuredMatch.tournament && (
            <p className="text-[10px] text-white/35 uppercase tracking-wider px-4 pb-2">{featuredMatch.tournament}</p>
          )}
          {divider}
          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <p className="font-display font-black uppercase text-white text-sm tracking-tight flex-1 text-center">{featuredMatch.team1}</p>
            <div className="shrink-0 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">VS</span>
            </div>
            <p className="font-display font-black uppercase text-white text-sm tracking-tight flex-1 text-center">{featuredMatch.team2}</p>
          </div>
          {featuredMatch.matchDate && (
            <p className="text-[10px] text-white/35 text-center pb-3 font-mono">
              {formatMatchDate(featuredMatch.matchDate, featuredMatch.matchTime)}
            </p>
          )}
        </div>
      ) : null}

      {/* Sorteos activos */}
      <SorteosCtaCard tone="dark" />

      {/* Códigos exclusivos */}
      <CodigosCtaCard />
    </aside>
  );
}
