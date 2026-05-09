const FAQS = [
  {
    q: '¿Qué tipo de competiciones analizamos?',
    a: 'Nos especializamos en el ecosistema europeo de CS2 — ESEA Main, ESEA Advanced, CCT Europe y otras competiciones tier 2 y tier 3. También cubrimos torneos tier 1 cuando hay valor real frente a la cuota. La premisa es siempre la misma: solo donde tenemos contexto suficiente.',
  },
  {
    q: '¿Cómo se publican los resultados?',
    a: 'Cada pick se publica en abierto en Blogabet antes del inicio del partido. El histórico es público y verificable: cuota, stake, resultado, profit y yield se actualizan automáticamente.',
  },
  {
    q: '¿Qué es Blogabet?',
    a: 'Blogabet es una plataforma independiente de tracking de tipsters. Verifica los picks publicados, calcula yield, ROI y profit acumulado, y hace público el histórico completo. Es el estándar de transparencia del sector.',
  },
  {
    q: '¿El acceso al canal es gratuito?',
    a: 'Sí. El canal de Telegram es 100% gratuito, sin VIPs de pago, sin upsells. Picks, análisis y seguimiento se publican abiertamente para toda la comunidad.',
  },
  {
    q: '¿Se muestran estadísticas reales?',
    a: 'Las estadísticas de la web están sincronizadas con el histórico público de Blogabet. ROI, yield, winrate y profit acumulado se calculan sobre los picks publicados — sin selección posterior.',
  },
  {
    q: '¿Qué tipo de apuestas se realizan?',
    a: 'Match winners, hándicaps de mapas, totales de rondas y mercados específicos cuando hay value. Stakes calibrados según convicción (1–3/10). Disciplina y bankroll por encima de todo.',
  },
  {
    q: '¿Qué relación tiene con SocialPro?',
    a: 'Apuesta Segura CS2 es un proyecto del ecosistema SocialPro, agencia gaming y esports fundada en Madrid en 2012. Misma exigencia editorial, misma cultura competitiva, mismo respeto por la audiencia.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8 md:mb-10">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
              FAQ
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark leading-[0.95]">
              Preguntas frecuentes
            </h2>
          </div>
          <p className="text-sm text-sp-muted max-w-sm">
            Lo que más nos preguntan sobre el canal, Blogabet y la metodología.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-2 md:gap-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group bg-sp-off border border-sp-border rounded-xl px-4 md:px-5 py-3 md:py-3.5 open:border-sp-pink/30 open:bg-white transition-colors"
            >
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                <span className="font-display font-black uppercase text-sp-dark text-sm md:text-[15px] leading-snug tracking-tight">
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="flex-none w-6 h-6 rounded-full border border-sp-border bg-white flex items-center justify-center text-sp-muted group-open:border-sp-pink/40 group-open:text-sp-pink group-open:rotate-45 transition-all"
                >
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 2V12M2 7H12"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-[13px] md:text-sm text-sp-muted leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
