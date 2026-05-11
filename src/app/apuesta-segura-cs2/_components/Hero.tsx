import Image from 'next/image';
import { CtaButton } from './CtaButton';
import { TelegramMockup } from './TelegramMockup';
import { TELEGRAM_URL, HERO_STATS, BLOGABET_URL } from './tokens';

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-sp-black text-white pt-12 pb-20 md:pt-16 md:pb-28"
    >
      <div
        aria-hidden
        className="absolute -top-40 -left-32 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.35), rgba(224,48,112,0.18) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(139,58,173,0.32), rgba(196,40,128,0.18) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <div className="relative">
            <div className="inline-flex items-center gap-2.5 mb-7">
              <Image
                src="/images/logos/2.png"
                alt="SocialPro"
                width={28}
                height={28}
                priority
                className="w-7 h-7 object-contain drop-shadow-[0_0_12px_rgba(224,48,112,0.45)]"
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-muted2">
                Apuesta Segura CS2 · by SocialPro
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.92]">
              <span className="block">Análisis</span>
              <span className="block bg-sp-grad bg-clip-text text-transparent">
                competitivo
              </span>
              <span className="block">de CS2</span>
            </h1>

            <p className="mt-7 text-base md:text-lg text-sp-muted2 leading-relaxed max-w-xl">
              <strong className="text-white font-semibold">ArkeroZ</strong>, pronosticador
              de CS2 especializado en ligas de tier 2-3 (ESEA Advanced, CCT, Exort Series).
              Apuestas con grandes informaciones, picks publicados a diario en abierto y
              comunidad gratuita en Telegram.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <CtaButton
                href={TELEGRAM_URL}
                ctaId="apuesta_cs2_hero_telegram"
                external
                className="!px-8 !py-4 !text-base"
              >
                Entrar al Telegram
              </CtaButton>
              <CtaButton
                href="#resultados"
                ctaId="apuesta_cs2_hero_stats"
                variant="outline"
                className="!px-8 !py-4 !text-base"
              >
                Ver estadísticas
              </CtaButton>
            </div>

            <div className="mt-12 grid grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06] max-w-2xl">
              {HERO_STATS.map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-sp-black px-2 py-4 md:px-4 md:py-5 flex flex-col items-center text-center"
                >
                  <span className="font-display text-lg sm:text-2xl md:text-3xl font-black tabular-nums bg-sp-grad bg-clip-text text-transparent">
                    {value}
                  </span>
                  <span className="mt-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.18em] md:tracking-[0.2em] text-sp-muted2">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs text-sp-muted2/80 max-w-md">
              Datos verificables públicamente en{' '}
              <a
                href={BLOGABET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/85 underline decoration-white/20 underline-offset-4 hover:decoration-sp-pink transition-colors"
              >
                arkeroz.blogabet.com
              </a>
            </p>
          </div>

          <div className="relative lg:translate-y-2">
            <div className="absolute -inset-6 bg-sp-grad opacity-20 blur-3xl rounded-[40px] pointer-events-none" />

            <div className="relative">
              <span className="absolute -top-6 left-6 z-10 inline-flex items-center gap-2 bg-sp-black/80 backdrop-blur border border-white/10 rounded-full px-3 py-1.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-sp-pink motion-safe:animate-ping opacity-60" />
                  <span className="relative w-2 h-2 rounded-full bg-sp-pink" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  Live · Histórico público
                </span>
              </span>

              <TelegramMockup density="compact" />

              <div className="absolute -bottom-8 -right-2 md:-right-6 max-w-[260px] hidden sm:block">
                <div className="bg-white text-sp-dark rounded-2xl p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] border border-black/5 -rotate-2 hover:rotate-0 transition-transform">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-orange">
                      Blogabet · ArkeroZ
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-sp-muted">
                      109 picks
                    </span>
                  </div>
                  <div className="font-display text-2xl font-black tabular-nums">
                    +223u
                  </div>
                  <div className="text-[11px] text-sp-muted">
                    Profit · Yield +27% · Mayo 25 → 26
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
