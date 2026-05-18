import Link from 'next/link';
import type { Brand } from '@/types';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getBrandBg } from '@/components/ui/brand-bg-map';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';

type Props = { brands: Brand[] }

const CHIPS = [
  'DGOJ Compliant',
  '< 72h de brief a campaña',
  'Resultados auditados',
  'España + 6 mercados LATAM',
] as const;

const METRICS = [
  { value: '340+', label: 'FTDs verificados' },
  { value: '15M+', label: 'Views / mes' },
  { value: '13+',  label: 'Años en gaming' },
] as const;

// Prioridad de marcas para el composition card — se filtran del roster real.
const PRIORITY = ['RAZER', '1WIN', 'SKINSMONKEY', 'KEYDROP', 'HELLCASE'];

export function NosotrosHero({ brands }: Props) {
  const prioritized = PRIORITY
    .map((key) => brands.find((b) => b.displayName.toUpperCase().replace(/[\s\-_.]/g, '').includes(key)))
    .filter((b): b is Brand => b !== undefined)
    .slice(0, 4);

  const showBrands = prioritized.length >= 2 ? prioritized : brands.slice(0, 4);

  return (
    <section className="bg-sp-black text-white pt-28 pb-24 lg:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left — narrative ─────────────────────────────────────── */}
          <FadeInOnScroll>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-sp-orange mb-6">
              Agencia gaming &amp; iGaming &middot; España &amp; LatAm &middot; Desde 2012
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-6xl font-black uppercase leading-[1.0] tracking-tight mb-6">
              Campañas gaming<br />
              e iGaming.{' '}
              <span className="gradient-text">
                Compliance<br />integrado.
              </span>{' '}
              Resultados<br />auditables.
            </h1>

            <p className="text-white/55 text-base leading-relaxed mb-8 max-w-lg">
              Creadores verificados en Twitch, YouTube, Kick e Instagram.
              Procesos adaptados a normativa DGOJ y métricas trazables
              directamente desde el panel del operador o plataforma de afiliados.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/15 text-white/65"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
              >
                Hablemos de tu campaña
              </Link>
              <Link
                href="/casos"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full border border-white/15 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Ver casos de éxito →
              </Link>
            </div>
          </FadeInOnScroll>

          {/* ── Right — evidence composition ─────────────────────────── */}
          <FadeInOnScroll delay={0.18}>
            <div className="relative pb-6 pr-4">

              {/* Main evidence card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">

                {/* Campaign status bar */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    CAMPAÑA ACTIVA
                  </span>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-[11px] text-white/45 font-medium">
                    iGaming · España + LatAm · 100+ creadores
                  </span>
                </div>

                {/* Brand logos — con aire entre ellos, no un wall */}
                <div className="px-6 py-6 flex items-center justify-between gap-4">
                  {showBrands.map((brand) => (
                    brand.logoUrl ? (
                      <BrandLogo
                        key={brand.id}
                        src={brand.logoUrl}
                        alt={brand.displayName}
                        plate={getBrandBg(brand.displayName)}
                        size="md"
                      />
                    ) : (
                      <span key={brand.id} className="text-xs font-bold text-white/60">
                        {brand.displayName}
                      </span>
                    )
                  ))}
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
                  {METRICS.map(({ value, label }) => (
                    <div key={label} className="px-4 py-4 text-center">
                      <div className="font-display text-2xl font-black gradient-text leading-none">
                        {value}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mt-1">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating DGOJ badge */}
              <div className="absolute bottom-0 right-0 bg-sp-dark border border-white/12 rounded-xl px-4 py-2.5 shadow-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">DGOJ Compliant</div>
                    <div className="text-[10px] text-white/40 leading-tight">Real Decreto 958/2020</div>
                  </div>
                </div>
              </div>

            </div>
          </FadeInOnScroll>

        </div>
      </div>
    </section>
  );
}
