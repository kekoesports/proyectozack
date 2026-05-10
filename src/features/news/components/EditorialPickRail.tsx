import Link from 'next/link';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';

type EditorialPick = {
  readonly slug: string;
  readonly league: string;
  readonly map: string;
  readonly teamA: string;
  readonly teamB: string;
  readonly hook: string;
  readonly when: string;
};

const TELEGRAM_URL = 'https://t.me/+B65oaDw_4jhmNDFk';

const PREVIEWS: readonly EditorialPick[] = [
  {
    slug: 'preview-cybershoke-vs-partizan-esea-advanced',
    league: 'ESEA Advanced · S52',
    map: 'Mirage',
    teamA: 'CYBERSHOKE',
    teamB: 'PARTIZAN',
    hook: 'CYBERSHOKE llega con racha 7-2 en ronda T y Mirage como pick fuerte. Partizan responde con CT-side estable.',
    when: 'Hoy · 19:00',
  },
  {
    slug: 'preview-nemiga-vs-into-the-breach-tier-2',
    league: 'CCT Europe · Stage 2',
    map: 'Anubis',
    teamA: 'NEMIGA',
    teamB: 'INTO THE BREACH',
    hook: 'Cambio de roster en NEMIGA tras el último major. Anubis puede ser el mapa decidor por la presión de pistolas.',
    when: 'Mañana · 17:30',
  },
  {
    slug: 'preview-genone-vs-aura-cct-stage',
    league: 'CCT Europe',
    map: 'Inferno',
    teamA: 'GENONE',
    teamB: 'AURA',
    hook: 'GENONE viene de cerrar 2-1 contra equipos con presupuesto el doble. Inferno es su mapa más fiable este split.',
    when: 'Sábado · 21:00',
  },
];

export function EditorialPickRail() {
  return (
    <section className="relative bg-sp-black border-t border-white/[0.06] py-14 md:py-20 overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 right-0 w-[420px] h-[420px] rounded-full pointer-events-none opacity-50"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245,99,42,0.12), rgba(139,58,173,0.06) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-2">
              Match previews · Editorial
            </p>
            <h2 className="font-display text-2xl md:text-4xl font-black uppercase text-white tracking-tight leading-[0.95]">
              Próximos enfrentamientos<br className="hidden md:block" />
              <span className="bg-sp-grad bg-clip-text text-transparent">tier europeo</span>
            </h2>
          </div>
          <p className="text-sm text-white/50 max-w-md leading-relaxed">
            Análisis previos antes de cada partido. Sin cuotas, sin humo —
            sólo lectura competitiva. Picks completas y stake en{' '}
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline decoration-white/25 underline-offset-4 hover:decoration-sp-pink transition-colors"
            >
              Apuesta Segura CS2
            </a>
            .
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PREVIEWS.map((p) => (
            <article
              key={p.slug}
              className="relative group bg-[#0c1016] border border-white/[0.07] rounded-2xl p-5 hover:border-white/15 hover:bg-[#10151d] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {p.league}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/45 bg-white/[0.04] border border-white/10 rounded-full px-2 py-0.5">
                  {p.map}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex-none w-9 h-9 rounded-md bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center font-display font-black text-[10px] text-white">
                    {p.teamA.slice(0, 3)}
                  </span>
                  <span className="font-display font-black uppercase text-sm tracking-tight text-white truncate">
                    {p.teamA}
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 pl-1">
                  vs
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex-none w-9 h-9 rounded-md bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center font-display font-black text-[10px] text-white">
                    {p.teamB.slice(0, 3)}
                  </span>
                  <span className="font-display font-black uppercase text-sm tracking-tight text-white truncate">
                    {p.teamB}
                  </span>
                </div>
              </div>

              <p className="text-sm text-white/60 leading-relaxed mb-5 line-clamp-3">
                {p.hook}
              </p>

              <div className="flex items-center justify-between text-[10px] text-white/35 pt-4 border-t border-white/[0.06]">
                <span className="uppercase tracking-wider tabular-nums">{p.when}</span>
                <Link
                  href={`/news/${p.slug}`}
                  className="font-display font-bold uppercase tracking-wider text-white/85 hover:text-white transition-colors"
                >
                  Leer análisis →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <TrackedCtaLink
            href={TELEGRAM_URL}
            ctaId="news_pickrail_telegram"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-white/15 text-white/85 font-display font-bold uppercase tracking-wider text-xs px-5 py-2.5 rounded-full hover:border-white/30 hover:bg-white/[0.04] transition-colors"
          >
            Ver picks completos en Telegram
            <span aria-hidden>→</span>
          </TrackedCtaLink>
        </div>
      </div>
    </section>
  );
}
