import type { InferSelectModel } from 'drizzle-orm';
import type { rankingEntries } from '@/db/schema';
import { FeaturedMatchCard, type FeaturedMatchMeta } from './FeaturedMatchCard';
import { SorteosCtaCard } from './SorteosCtaCard';
import { CodigosCtaCard } from './CodigosCtaCard';

type RankingEntry = InferSelectModel<typeof rankingEntries>;

type Props = {
  readonly featuredMatch: FeaturedMatchMeta | null;
  readonly ranking:       readonly RankingEntry[];
};

export function NewsHubSidebar({ featuredMatch, ranking }: Props) {
  // Only show match widget if active and has both teams
  const showMatch = !!(
    featuredMatch?.isActive !== false &&
    featuredMatch?.team1 &&
    featuredMatch?.team2
  );

  return (
    <aside className="flex flex-col gap-3 min-w-0">

      {/* Partido destacado */}
      {showMatch && featuredMatch && <FeaturedMatchCard meta={featuredMatch} />}

      {/* Ranking hispano */}
      {ranking.length > 0 && (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Ranking Hispano</p>
          </div>
          <ul>
            {ranking.map((e, i) => (
              <li key={e.id} className={i > 0 ? 'border-t border-white/[0.04]' : ''}>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span
                    className="font-display font-black text-sm tabular-nums w-4 shrink-0"
                    style={{ color: i === 0 ? '#f5632a' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.35)' }}
                  >
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

      {/* CTAs */}
      <SorteosCtaCard tone="dark" />
      <CodigosCtaCard />

    </aside>
  );
}
