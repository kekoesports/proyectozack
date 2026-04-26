'use client';

import { GiveawayCarousel } from './GiveawayCarousel';
import { GiveawayHubCard } from './GiveawayHubCard';
import type { GiveawayWithTalent } from '@/types';

type GiveawaySectionProps = {
  readonly active: readonly GiveawayWithTalent[];
  readonly finished: readonly GiveawayWithTalent[];
};

export function GiveawaySection({ active, finished }: GiveawaySectionProps): React.JSX.Element | null {
  if (active.length === 0 && finished.length === 0) return null;

  return (
    <div className="mt-10 border-t border-white/[0.05] pt-10">
      {/* Active giveaways carousel */}
      {active.length > 0 && (
        <GiveawayCarousel
          giveaways={active}
          title="Sorteos activos"
          subtitle={`${active.length} en directo`}
        />
      )}

      {/* Finished giveaways — collapsible */}
      {finished.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer flex items-center gap-3 list-none py-3 opacity-40 hover:opacity-60 transition-opacity">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
              Sorteos finalizados
            </span>
            <span className="text-[10px] font-bold text-white/50 tabular-nums">
              ({finished.length})
            </span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-white/50 group-open:hidden">
              Mostrar
            </span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-white/50 hidden group-open:inline">
              Ocultar
            </span>
          </summary>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {finished.map((g) => (
              <GiveawayHubCard key={g.id} giveaway={g} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
