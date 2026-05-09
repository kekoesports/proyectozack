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
    <section id="faq" className="relative bg-white py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-4">
            FAQ
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black uppercase text-sp-dark leading-[0.95]">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group bg-sp-off border border-sp-border rounded-2xl px-5 md:px-6 py-4 md:py-5 open:border-sp-pink/30 open:bg-white transition-colors"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                <span className="font-display font-black uppercase text-sp-dark text-base md:text-lg leading-snug tracking-tight">
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="flex-none w-8 h-8 rounded-full border border-sp-border bg-white flex items-center justify-center text-sp-muted group-open:border-sp-pink/40 group-open:text-sp-pink group-open:rotate-45 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 2V12M2 7H12"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-sm md:text-[15px] text-sp-muted leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
