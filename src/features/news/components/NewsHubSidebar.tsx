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

export function NewsHubSidebar({ latestPosts, featuredMatch }: Props) {
  const ultimaHora = latestPosts.slice(0, 5);
  const hasMatch = !!(featuredMatch?.team1 && featuredMatch?.team2);

  return (
    <aside className="flex flex-col gap-5">
      {/* Última hora */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sp-orange animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white">Última hora</p>
          </div>
          <Link href="/news" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">
            Ver todas →
          </Link>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {ultimaHora.length === 0 ? (
            <li className="px-4 py-3 text-xs text-white/40">Sin novedades recientes.</li>
          ) : (
            ultimaHora.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/news/${p.slug}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                >
                  <span className="text-[10px] text-sp-orange font-mono mt-0.5 shrink-0">
                    {formatNewsDate(p.publishedAt)}
                  </span>
                  <p className="text-xs text-white/80 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {p.title}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Partido destacado */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-3">Partido destacado</p>
        {hasMatch ? (
          <div>
            {featuredMatch.tournament && (
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">{featuredMatch.tournament}</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-black uppercase text-white text-sm tracking-tight">{featuredMatch.team1}</p>
              <span className="text-[10px] font-bold text-white/30 px-2">vs</span>
              <p className="font-display font-black uppercase text-white text-sm tracking-tight">{featuredMatch.team2}</p>
            </div>
            {(featuredMatch.matchDate) && (
              <p className="text-[10px] text-white/40 mt-2 text-center">
                {formatMatchDate(featuredMatch.matchDate, featuredMatch.matchTime)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-white/25 italic">Próximamente</p>
        )}
      </div>

      {/* Ranking hispano — placeholder Fase 3 */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40 mb-3">Ranking hispano</p>
        <p className="text-xs text-white/25 italic">Próximamente</p>
      </div>

      {/* Sorteos activos */}
      <SorteosCtaCard tone="dark" />

      {/* Códigos exclusivos */}
      <CodigosCtaCard />
    </aside>
  );
}
