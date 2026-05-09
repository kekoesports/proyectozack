import { CtaButton } from './CtaButton';
import {
  BLOGABET_URL,
  TELEGRAM_URL,
  KPIS,
  PROFIT_CURVE_REAL,
  PROFIT_CURVE_LABELS,
  WIN_LOSS,
  TOP_SPORTS,
} from './tokens';

function ProfitCurve() {
  const w = 520;
  const h = 180;
  const pad = { l: 36, r: 16, t: 18, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const data = PROFIT_CURVE_REAL;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = innerW / (data.length - 1);

  const points = data.map((v, i) => ({
    x: pad.l + i * stepX,
    y: pad.t + (1 - (v - min) / span) * innerH,
  }));
  const last = points[points.length - 1] ?? { x: pad.l + innerW, y: pad.t };
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L${last.x.toFixed(2)},${(pad.t + innerH).toFixed(2)} L${pad.l},${(pad.t + innerH).toFixed(2)} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="bg-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(245,99,42,0.32)" />
          <stop offset="100%" stopColor="rgba(139,58,173,0)" />
        </linearGradient>
        <linearGradient id="bg-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f5632a" />
          <stop offset="55%" stopColor="#e03070" />
          <stop offset="100%" stopColor="#8b3aad" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => (
        <line
          key={i}
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + t * innerH}
          y2={pad.t + t * innerH}
          stroke="rgba(0,0,0,0.06)"
          strokeDasharray="2 4"
        />
      ))}
      <text x={pad.l - 6} y={pad.t + 4} textAnchor="end" fontSize="9" fill="rgba(0,0,0,0.4)">
        +{max}u
      </text>
      <text x={pad.l - 6} y={pad.t + innerH + 4} textAnchor="end" fontSize="9" fill="rgba(0,0,0,0.4)">
        +{min}u
      </text>
      <path d={area} fill="url(#bg-area)" />
      <path d={line} fill="none" stroke="url(#bg-line)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="9" fill="rgba(224,48,112,0.18)" />
      <circle cx={last.x} cy={last.y} r="4" fill="#e03070" />
      <text x={pad.l} y={h - 8} textAnchor="start" fontSize="9" fill="rgba(0,0,0,0.45)">
        {PROFIT_CURVE_LABELS[0]}
      </text>
      <text x={w - pad.r} y={h - 8} textAnchor="end" fontSize="9" fill="rgba(0,0,0,0.45)">
        {PROFIT_CURVE_LABELS[PROFIT_CURVE_LABELS.length - 1]}
      </text>
    </svg>
  );
}

function DonutSplit({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number;
  b: number;
  labelA: string;
  labelB: string;
}) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const aLen = (a / (a + b)) * c;
  return (
    <div className="flex items-center gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="10" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#donut-grad)"
          strokeWidth="10"
          strokeDasharray={`${aLen} ${c}`}
          strokeDashoffset={c / 4}
          transform="rotate(-90 40 40)"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="donut-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5632a" />
            <stop offset="1" stopColor="#8b3aad" />
          </linearGradient>
        </defs>
        <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1a1a1a">
          {a}%
        </text>
      </svg>
      <div className="text-xs text-sp-muted leading-snug">
        <div className="text-sp-dark font-bold uppercase tracking-wider text-[10px]">{labelA}</div>
        <div className="mt-1 text-[11px]">vs {b}% {labelB}</div>
      </div>
    </div>
  );
}

export function BlogabetValidation() {
  return (
    <section id="resultados" className="relative bg-sp-off py-24 md:py-32 overflow-hidden">
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.18), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-4">
              Resultados públicos
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-black uppercase text-sp-dark leading-[0.92] mb-6">
              No nos creas<br />
              a nosotros.<br />
              <span className="bg-sp-grad bg-clip-text text-transparent">Cree los datos.</span>
            </h2>
            <p className="text-base md:text-lg text-sp-muted leading-relaxed mb-6 max-w-md">
              Cada pick se publica en Blogabet <strong className="text-sp-dark">antes</strong> del
              inicio del partido. El histórico es <strong className="text-sp-dark">público y abierto</strong>,
              cualquiera puede leerlo.
            </p>
            <p className="text-sm text-sp-muted leading-relaxed mb-8 max-w-md">
              Blogabet free es self-graded — el propio tipster marca wins y
              losses. Lo que ves aquí está sincronizado con su perfil público.
              Sin selección posterior, sin cherry-picking.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <CtaButton
                href={BLOGABET_URL}
                ctaId="apuesta_cs2_results_blogabet"
                variant="dark"
                external
              >
                Ver perfil completo
              </CtaButton>
              <CtaButton
                href={TELEGRAM_URL}
                ctaId="apuesta_cs2_results_telegram"
                variant="outline"
                external
                className="!text-sp-dark !border-sp-dark/15 hover:!bg-sp-dark/5 hover:!border-sp-dark/30"
              >
                Entrar al Telegram
              </CtaButton>
            </div>
          </div>

          <div className="relative">
            <div className="relative bg-white border border-sp-border rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.2)] overflow-hidden">
              <div className="bg-sp-dark text-white px-6 md:px-7 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-display font-black uppercase tracking-tight text-base">
                    Blogabet
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-white/45">
                    arkeroz.blogabet.com
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/70 bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-1">
                  Histórico público · Self-graded
                </span>
              </div>

              <div className="px-6 md:px-7 py-7">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-sp-border">
                  <div className="w-14 h-14 rounded-xl bg-sp-grad p-[2px]">
                    <div className="w-full h-full rounded-[10px] bg-sp-dark flex items-center justify-center">
                      <span className="font-display font-black text-lg text-white">
                        AZ
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-display font-black text-sp-dark text-xl tracking-tight leading-none">
                      Hi, I’m ArkeroZ
                    </div>
                    <div className="text-xs text-sp-muted mt-1.5">
                      CS2 · 109 picks · Histórico abierto desde mayo 2025
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-sp-border rounded-xl overflow-hidden border border-sp-border mb-6">
                  {KPIS.map(({ label, value, tag }) => (
                    <div key={label} className="bg-white px-4 py-4">
                      <dt className="text-[10px] uppercase tracking-wider text-sp-muted/80">
                        {label}
                      </dt>
                      <dd className="font-display font-black tabular-nums text-2xl mt-1 bg-sp-grad bg-clip-text text-transparent">
                        {value}
                      </dd>
                      <dd className="text-[10px] text-sp-muted/70 mt-0.5">{tag}</dd>
                    </div>
                  ))}
                </dl>

                <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-black uppercase text-sp-dark text-sm tracking-tight">
                        Profit chart · 12 meses
                      </h3>
                      <span className="text-[11px] text-sp-muted tabular-nums">
                        +55u → +222u
                      </span>
                    </div>
                    <ProfitCurve />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-3 content-start">
                    <DonutSplit a={WIN_LOSS.won} b={WIN_LOSS.lost} labelA="Won" labelB="Lost" />
                    <DonutSplit
                      a={TOP_SPORTS.esports}
                      b={TOP_SPORTS.combos}
                      labelA="E-Sports"
                      labelB="Combos"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-sp-muted/80">
              Datos sincronizados con el perfil público de Blogabet. Free blog ·
              picks self-graded.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
