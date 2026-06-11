import Image from 'next/image';
import Link from 'next/link';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';

type Variant = 'full' | 'compact';

const PILLARS = [
  'Pronosticador CS2 · 5+ años en escena',
  'Tier 2-3 · ESEA Advanced · CCT · Exort Series',
  'Apuestas con grandes informaciones',
  'Histórico público en Blogabet · Telegram gratuito',
];

const HREF = '/apuesta-segura-cs2';

type Props = {
  readonly variant?: Variant;
  readonly ctaId: string;
  readonly className?: string;
};

/**
 * Módulo de cross-link al canal Apuesta Segura CS2 (by SocialPro). Pensado
 * para insertarse en home, perfiles de creadores CS2 y secciones gaming —
 * NUNCA con lenguaje betting/casino. El gancho es siempre análisis
 * competitivo, escena CS2 y comunidad.
 *
 * Naming: "Apuesta Segura CS2" es el brand principal del proyecto desde
 * 2022. "CS2 Competitive Lab" puede usarse en futuro como concepto
 * editorial secundario, pero NO sustituye al brand actual.
 */
export function Cs2LabCard({ variant = 'compact', ctaId, className = '' }: Props) {
  if (variant === 'full') {
    return (
      <section className={`relative bg-sp-black text-white overflow-hidden ${className}`}>
        <div
          aria-hidden
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(245,99,42,0.20), rgba(224,48,112,0.10) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -right-32 w-[460px] h-[460px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(139,58,173,0.20), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2.5 mb-5">
                <Image
                  src="/images/logos/2.png"
                  alt="SocialPro"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain drop-shadow-[0_0_10px_rgba(224,48,112,0.4)]"
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange">
                  Apuesta Segura CS2 · by SocialPro
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-5xl font-black uppercase leading-[0.95] mb-5">
                Análisis competitivo<br />
                <span className="bg-sp-grad bg-clip-text text-transparent">de CS2</span>
                {' '}por quien la vive
              </h2>
              <p className="text-base md:text-lg text-white/65 leading-relaxed max-w-xl mb-7">
                División editorial dentro del ecosistema SocialPro. ArkeroZ,
                pronosticador CS2 especializado en ligas tier 2-3 (ESEA Advanced,
                CCT, Exort Series). Apuestas con grandes informaciones, picks
                publicados a diario en abierto.
              </p>

              <ul className="grid sm:grid-cols-2 gap-2.5 max-w-xl mb-9">
                {PILLARS.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2.5 text-sm text-white/75"
                  >
                    <span aria-hidden className="flex-none w-1.5 h-1.5 rounded-full bg-sp-orange" />
                    {p}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <TrackedCtaLink
                  href={HREF}
                  ctaId={ctaId}
                  className="inline-flex items-center justify-center gap-2 bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-7 py-3.5 rounded-full shadow-[0_10px_30px_-10px_rgba(224,48,112,0.5)] hover:shadow-[0_18px_42px_-10px_rgba(224,48,112,0.7)] hover:-translate-y-0.5 transition-all"
                >
                  Entrar al canal
                </TrackedCtaLink>
                <Link
                  href="/influencers-cs2"
                  className="inline-flex items-center justify-center gap-2 border border-white/15 text-white/85 font-display font-bold uppercase tracking-wider text-sm px-7 py-3.5 rounded-full hover:border-white/30 hover:bg-white/[0.04] transition-colors"
                >
                  Ver creadores CS2
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-3xl p-7 backdrop-blur">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sp-grad p-[2px]">
                      <div className="w-full h-full rounded-[10px] bg-sp-black flex items-center justify-center">
                        <span className="font-display font-black text-base bg-sp-grad bg-clip-text text-transparent">
                          AZ
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-display font-black text-white text-base leading-none">
                        ArkeroZ
                      </div>
                      <div className="text-[11px] text-white/45 mt-1">
                        CS2 Analyst · Apuesta Segura CS2
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-white/65 bg-white/[0.05] border border-white/10 rounded-full px-2 py-0.5">
                    Histórico abierto
                  </span>
                </div>
                <dl className="grid grid-cols-3 gap-px bg-white/[0.07] rounded-lg overflow-hidden border border-white/[0.07]">
                  {[
                    { l: 'Picks', v: '109' },
                    { l: 'Yield', v: '+27%' },
                    { l: 'Profit', v: '+223u' },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-sp-black px-3 py-3 text-center">
                      <dt className="text-[10px] uppercase tracking-wider text-white/40">
                        {l}
                      </dt>
                      <dd className="font-display font-black tabular-nums text-base mt-1 bg-sp-grad bg-clip-text text-transparent">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-[11px] text-white/40 text-center">
                  Datos sincronizados con Blogabet · refresh manual
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <TrackedCtaLink
      href={HREF}
      ctaId={ctaId}
      className={`relative group block bg-sp-black text-white overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/15 transition-colors shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.25), rgba(224,48,112,0.10) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div className="relative p-6 md:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-none">
          <div className="w-14 h-14 rounded-xl bg-sp-grad p-[2px]">
            <div className="w-full h-full rounded-[10px] bg-sp-black flex items-center justify-center">
              <Image
                src="/images/logos/2.png"
                alt="SocialPro"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
              />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-1.5">
            Apuesta Segura CS2 · by SocialPro
          </div>
          <h3 className="font-display text-xl md:text-2xl font-black uppercase tracking-tight leading-tight mb-1.5">
            Análisis competitivo CS2 por ArkeroZ
          </h3>
          <p className="text-sm text-white/55 leading-snug">
            Pronosticador CS2 · tier 2-3 (ESEA Advanced, CCT, Exort Series) ·
            Apuestas con grandes informaciones · Telegram gratuito.
          </p>
        </div>
        <span className="flex-none inline-flex items-center gap-2 font-display font-bold uppercase tracking-wider text-xs text-white/85 group-hover:text-white transition-colors">
          Entrar al canal
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </TrackedCtaLink>
  );
}
