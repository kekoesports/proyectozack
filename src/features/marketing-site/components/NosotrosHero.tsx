import Image from 'next/image';
import Link from 'next/link';
import type { Brand } from '@/types';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';

type Props = { brands: Brand[] }

const CHIPS = [
  'DGOJ Compliant',
  '< 72h de brief a campaña',
  'Resultados auditados',
  'España + 6 mercados LATAM',
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

          {/* ── Right — typographic proof, sin card decorativa ────── */}
          <FadeInOnScroll delay={0.18}>
            <div className="lg:pl-8 space-y-10">

              {/* Stat principal — el número más impactante */}
              <div>
                <div className="font-display text-8xl md:text-9xl font-black gradient-text leading-none">
                  +340
                </div>
                <p className="text-white/55 text-sm mt-3 leading-snug">
                  FTDs verificados en una sola activación
                </p>
                <p className="text-white/25 text-[11px] mt-1.5 font-semibold uppercase tracking-widest">
                  1WIN × CS2 &middot; Q1 2025 &middot; Panel del operador
                </p>
              </div>

              {/* 3 logos — espaciados, monocromo, sin contenedor */}
              <div className="flex items-center gap-8">
                {showBrands.slice(0, 3).map((brand) => (
                  brand.logoUrl ? (
                    <Image
                      key={brand.id}
                      src={brand.logoUrl}
                      alt={brand.displayName}
                      width={80}
                      height={28}
                      className="h-6 w-auto max-w-[70px] object-contain brightness-0 invert opacity-45"
                    />
                  ) : null
                ))}
              </div>

              {/* Stat secundaria con acento naranja */}
              <div className="border-l-2 border-sp-orange pl-4">
                <div className="font-display text-2xl font-black text-white leading-none">15M+</div>
                <div className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mt-1">
                  Views mensuales en el roster
                </div>
              </div>

              {/* DGOJ badge — integrado, sin flotar */}
              <div className="inline-flex items-center gap-2.5 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white leading-tight">DGOJ Compliant</div>
                  <div className="text-[10px] text-white/40 leading-tight">Real Decreto 958/2020</div>
                </div>
              </div>

            </div>
          </FadeInOnScroll>

        </div>
      </div>
    </section>
  );
}
