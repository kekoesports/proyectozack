import { CtaButton } from './CtaButton';
import { BLOGABET_URL } from './tokens';

const EXPERTISE = [
  'ESEA Main',
  'ESEA Advanced',
  'CCT Europe',
  'Tier 2 EU',
  'Tier 3 EU',
  'Mapas y vetos',
  'Cambios de roster',
  'Forma competitiva',
];

export function TrustBlock() {
  return (
    <section id="confianza" className="relative bg-sp-off py-24 md:py-32 overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 right-0 w-[420px] h-[420px] rounded-full pointer-events-none opacity-50"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.18), rgba(224,48,112,0.08) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-20 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="relative bg-gradient-to-br from-sp-black via-sp-dark to-sp-black border border-sp-black rounded-3xl overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.45)]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              <div
                aria-hidden
                className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-sp-pink/30 blur-3xl pointer-events-none"
              />

              <div className="relative p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-sp-orange">
                    Tipster principal
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/60 bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sp-orange" />
                    Histórico público · Blogabet
                  </span>
                </div>

                <div className="flex items-center gap-5 mb-8">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-sp-grad" />
                    <div className="absolute inset-[2px] rounded-[14px] bg-sp-black flex items-center justify-center">
                      <span className="font-display font-black text-3xl bg-sp-grad bg-clip-text text-transparent">
                        AZ
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-display font-black text-white text-3xl tracking-tight">
                      ArkeroZ
                    </div>
                    <div className="text-sm text-white/50 mt-1">
                      CS2 Analyst · 5+ años en escena competitiva
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden border border-white/[0.06] mb-7">
                  {[
                    { l: 'Yield', v: '+27%' },
                    { l: 'Profit', v: '+223u' },
                    { l: 'Winrate', v: '67%' },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-sp-black px-4 py-4 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        {l}
                      </div>
                      <div className="font-display font-black text-white tabular-nums text-lg">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>

                <CtaButton
                  href={BLOGABET_URL}
                  ctaId="apuesta_cs2_trust_blogabet"
                  variant="outline"
                  external
                  className="w-full !py-3.5"
                >
                  Ver perfil completo en Blogabet
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path
                      d="M3 10L10 3M10 3H4.5M10 3V8.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </CtaButton>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-4">
              Conoce al analista
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black uppercase text-sp-dark leading-[0.95] mb-6">
              5 años estudiando<br />
              el ecosistema<br />
              <span className="bg-sp-grad bg-clip-text text-transparent">competitivo de CS2</span>
            </h2>
            <p className="text-base md:text-lg text-sp-muted leading-relaxed mb-5">
              ArkeroZ no es un tipster genérico. Es un analista que sigue a
              diario las ligas que importan: <strong className="text-sp-dark">ESEA Main</strong>,{' '}
              <strong className="text-sp-dark">ESEA Advanced</strong>, CCT Europe y el resto del tier 2-3
              europeo. Conoce a los equipos antes de que los conozca el resto.
            </p>
            <p className="text-sm text-sp-muted leading-relaxed mb-8">
              No prometemos certezas. Operamos donde hay valor real frente a la
              cuota — vetos, mapas, rosters, contexto previo — y lo publicamos
              en abierto en Blogabet para que cualquiera pueda verificarlo.
            </p>

            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.2em] text-sp-muted/80 font-bold mb-3">
                Áreas de cobertura
              </div>
              <ul className="flex flex-wrap gap-2">
                {EXPERTISE.map((e) => (
                  <li
                    key={e}
                    className="px-3 py-1.5 rounded-full border border-sp-border bg-white text-xs text-sp-dark/80 font-medium"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            <div className="inline-flex items-center gap-3 bg-white border border-sp-border rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-lg bg-sp-grad/10 border border-sp-pink/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
                    fill="url(#tg-1)"
                  />
                  <defs>
                    <linearGradient id="tg-1" x1="0" y1="0" x2="24" y2="24">
                      <stop offset="0" stopColor="#f5632a" />
                      <stop offset="1" stopColor="#8b3aad" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <div className="font-display font-black uppercase text-sp-dark text-sm tracking-tight">
                  Parte del ecosistema SocialPro
                </div>
                <div className="text-xs text-sp-muted">
                  Agencia gaming y esports · Madrid · 2012
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
