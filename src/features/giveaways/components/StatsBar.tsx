type StatsBarProps = {
  activeCount: number;
  totalValue: string;
  finishedCount: number;
  codesCount: number;
}

/**
 * Barra de stats agregadas (activos, valor total, finalizados, códigos) del hub.
 *
 * @kind server
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <StatsBar activeCount={8} totalValue={5000} finishedCount={32} codesCount={120} />
 * ```
 */
export function StatsBar({ activeCount, totalValue, finishedCount, codesCount }: StatsBarProps) {
  const hasGiveaways = activeCount > 0 || finishedCount > 0;

  return (
    <div className="border-y border-white/[0.04] bg-white/[0.01]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-8 md:gap-16">
        <div className="text-center">
          <p className="text-2xl font-black gw-sp-value">{codesCount}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mt-0.5">Códigos activos</p>
        </div>
        {hasGiveaways && (
          <>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-2xl font-black gw-sp-value">{activeCount}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mt-0.5">Sorteos activos</p>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-2xl font-black gw-sp-value">{totalValue}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mt-0.5">En premios</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
