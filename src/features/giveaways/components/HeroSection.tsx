import Image from 'next/image';

type HeroSectionProps = {
  readonly codesCount: number;
  readonly activeGiveawaysCount: number;
  readonly creatorsCount: number;
};

/**
 * Hero del hub de giveaways con contadores agregados.
 *
 * @kind server
 * @feature giveaways
 * @route /giveaways
 * @example
 * ```tsx
 * <HeroSection codesCount={120} activeGiveawaysCount={8} creatorsCount={42} />
 * ```
 */
export function HeroSection({ codesCount, activeGiveawaysCount, creatorsCount }: HeroSectionProps): React.JSX.Element {
  return (
    <section className="relative overflow-hidden pt-10 pb-14 md:pt-14 md:pb-18">
      {/* Glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 110% 100% at 50% -15%, rgba(245,99,42,0.13) 0%, rgba(139,58,173,0.09) 45%, transparent 75%)',
        }}
        aria-hidden
      />

      {/* SP watermark */}
      <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none overflow-hidden hidden lg:flex items-center justify-end pr-8 opacity-[0.025]" aria-hidden>
        <Image
          src="/images/logos/2.png"
          alt=""
          width={360}
          height={180}
          className="w-96 object-contain brightness-0 invert"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2.5 mb-5">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-sp-orange/60" />
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-sp-orange/75">
            SocialPro · Rewards Hub
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-sp-orange/60" />
        </div>

        {/* Title */}
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.88] mb-4">
          <span className="text-white">Códigos &</span>
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #f5632a 0%, #e03070 50%, #8b3aad 100%)' }}
          >
            Recompensas
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-lg mx-auto text-sm md:text-[15px] font-medium text-white/40 leading-relaxed mb-8">
          Todos los códigos activos de tus creadores favoritos de casino, apuestas y CS2, en un solo lugar.
        </p>

        {/* Stats */}
        <div className="inline-flex items-center gap-5 md:gap-8 mb-9 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm flex-wrap justify-center">
          <StatItem value={codesCount} label="Códigos activos" />
          {activeGiveawaysCount > 0 && (
            <>
              <div className="h-7 w-px bg-white/[0.08]" />
              <StatItem value={activeGiveawaysCount} label="Sorteos activos" live />
            </>
          )}
          <div className="h-7 w-px bg-white/[0.08]" />
          <StatItem value={creatorsCount} label="Creadores" />
        </div>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href="#codigos"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-sp-grad text-white text-xs font-black uppercase tracking-[0.14em] gw-sp-btn-glow hover:opacity-90 transition-opacity"
          >
            Ver códigos
            <span aria-hidden>↓</span>
          </a>
          <a
            href="#creadores"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white/70 text-xs font-black uppercase tracking-[0.14em] hover:bg-white/[0.07] hover:text-white hover:border-white/[0.18] transition-all"
          >
            Explorar creadores
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, label, live = false }: { value: number; label: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {live && <span className="h-1.5 w-1.5 rounded-full bg-sp-orange animate-pulse shrink-0" />}
      <span className="text-2xl font-black gw-sp-value tabular-nums">{value}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 leading-snug text-left">
        {label}
      </span>
    </div>
  );
}
