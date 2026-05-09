import { STEPS } from './tokens';

export function HowWeWork() {
  return (
    <section
      id="metodologia"
      className="relative bg-sp-black text-white py-24 md:py-32 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-4">
              Metodología SocialPro
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-black uppercase leading-[0.92]">
              Cómo nace<br />
              <span className="bg-sp-grad bg-clip-text text-transparent">cada pick</span>
            </h2>
          </div>
          <p className="text-sp-muted2 max-w-md text-base leading-relaxed">
            Sin humo, sin volumen forzado. El mismo workflow que aplica un
            analista de equipo profesional, adaptado al ecosistema de
            apuestas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
          {STEPS.map(({ n, title, desc }, i) => (
            <article
              key={title}
              className="relative bg-sp-black p-7 md:p-8 group hover:bg-sp-dark transition-colors"
            >
              <div
                aria-hidden
                className="absolute top-4 right-4 font-display font-black text-7xl md:text-8xl leading-none tabular-nums select-none pointer-events-none transition-opacity"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(245,99,42,0.18), rgba(139,58,173,0.18))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {n}
              </div>

              <div className="relative pt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-sp-orange mb-3">
                  Paso {i + 1}
                </div>
                <h3 className="font-display font-black uppercase text-white text-xl leading-tight mb-3">
                  {title}
                </h3>
                <p className="text-sm text-white/55 leading-relaxed max-w-xs">
                  {desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
