import { CtaButton } from './CtaButton';
import { MONTHLY_EUR_2026, YEAR_TOTAL_2026, YEAR_LABEL, TELEGRAM_URL } from './tokens';

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export function MonthlyResults() {
  const max = Math.max(...MONTHLY_EUR_2026.map((m) => m.v));

  return (
    <section className="relative bg-sp-black text-white py-24 md:py-32 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div
        aria-hidden
        className="absolute -top-32 right-1/4 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.20), rgba(139,58,173,0.10) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-4">
              Resultados 2026 · En euros
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-black uppercase leading-[0.92]">
              Beneficio neto<br />
              <span className="bg-sp-grad bg-clip-text text-transparent">mes a mes</span>
            </h2>
          </div>
          <p className="text-sp-muted2 max-w-md text-base leading-relaxed">
            Las unidades de Blogabet, traducidas a € reales que generan los
            seguidores que aplican el sistema con disciplina y bankroll
            adecuado.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 mb-10">
          <div className="bg-sp-dark/70 border border-white/[0.07] rounded-3xl p-7 md:p-8">
            <div className="flex items-end justify-between mb-7">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-sp-orange mb-2">
                  {YEAR_LABEL}
                </div>
                <div className="font-display font-black tabular-nums text-5xl md:text-6xl bg-sp-grad bg-clip-text text-transparent leading-none">
                  {fmtEUR(YEAR_TOTAL_2026)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                  Mejor mes
                </div>
                <div className="font-display font-black text-white tabular-nums text-xl">
                  {fmtEUR(max)}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">Abril 2026</div>
              </div>
            </div>

            <div className="space-y-3.5">
              {MONTHLY_EUR_2026.map(({ m, v }) => (
                <div key={m} className="flex items-center gap-4">
                  <div className="w-20 text-[11px] font-bold uppercase tracking-wider text-white/55">
                    {m}
                  </div>
                  <div className="flex-1 relative h-8 rounded-md bg-white/[0.04] border border-white/[0.05] overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-sp-grad rounded-md shadow-[0_0_24px_-6px_rgba(224,48,112,0.6)]"
                      style={{ width: `${(v / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right font-display font-black tabular-nums text-white text-base">
                    {fmtEUR(v)}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-7 pt-5 border-t border-white/[0.06] text-xs text-white/40 leading-relaxed">
              Datos contables del proyecto. Mayo–Diciembre se actualizan
              mensualmente. Resultados pasados no garantizan resultados
              futuros — apuesta solo lo que puedas permitirte perder.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-6">
            <div className="bg-sp-dark/70 border border-white/[0.07] rounded-3xl p-7 flex flex-col justify-center">
              <div className="text-[10px] uppercase tracking-[0.22em] text-sp-orange mb-3">
                Crecimiento Q1 2026
              </div>
              <div className="font-display font-black tabular-nums text-3xl md:text-4xl text-white leading-none">
                <span className="bg-sp-grad bg-clip-text text-transparent">×14</span>{' '}
                vs enero
              </div>
              <p className="mt-4 text-sm text-white/55 leading-relaxed">
                430 € (enero) → 6.206 € (abril). El sistema se aplica con la
                misma disciplina cada mes; el volumen de seguidores aplicando
                la metodología es lo que escala.
              </p>
            </div>

            <div className="bg-sp-dark/70 border border-white/[0.07] rounded-3xl p-7 flex flex-col justify-center">
              <div className="text-[10px] uppercase tracking-[0.22em] text-sp-orange mb-3">
                Aplica gratis
              </div>
              <p className="text-sm text-white/65 leading-relaxed mb-5">
                El canal de Telegram publica cada pick antes del partido.
                Tú decides si aplicar.
              </p>
              <CtaButton
                href={TELEGRAM_URL}
                ctaId="apuesta_cs2_results_eur_telegram"
                external
                className="!w-full"
              >
                Entrar al Telegram
              </CtaButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
