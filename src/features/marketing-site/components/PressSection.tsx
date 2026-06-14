import Link from 'next/link';

type MediaAppearance = {
  readonly id: string;
  readonly medium: string;
  readonly network: string;
  readonly program: string;
  readonly category: string;
  readonly date: string;
  readonly description: string;
  readonly url: string;
  readonly isExternal?: boolean;
  readonly isNew?: boolean;
};

const APPEARANCES: MediaAppearance[] = [
  {
    id: 'canal-sur-radio-jun-2026',
    medium: 'Canal Sur Radio',
    network: 'RTVA · Andalucía',
    program: 'Todo e-Games',
    category: 'Radio · Podcast',
    date: '13 de junio de 2026',
    description:
      'Pablo Camacho (CEO) habla de marketing gaming, iGaming y el ecosistema de agencias de esports en España ante la audiencia de Canal Sur Radio.',
    url: 'https://audio.canalsurmas.es/videos/detail/374811-podcast-todo-e-games-13062026mp3',
    isExternal: true,
    isNew: true,
  },
];

function MicrophoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function AppearanceCard({ item }: { readonly item: MediaAppearance }) {
  const linkProps = item.isExternal
    ? { href: item.url, target: '_blank' as const, rel: 'noopener noreferrer' }
    : { href: item.url };

  return (
    <article className="group relative flex flex-col bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.18] transition-colors">
      {/* Gradient accent top bar */}
      <div className="h-[3px] bg-sp-grad" aria-hidden="true" />

      <div className="flex flex-col flex-1 p-6 gap-4">
        {/* Header: category + new badge */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            <MicrophoneIcon />
            {item.category}
          </span>
          {item.isNew && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-sp-orange/15 text-sp-orange border border-sp-orange/25">
              Nuevo
            </span>
          )}
        </div>

        {/* Medium + network */}
        <div>
          <p className="font-display font-black uppercase text-white text-xl md:text-2xl leading-none">
            {item.medium}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35 mt-1.5">
            {item.network}
          </p>
        </div>

        {/* Program + date */}
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-sm font-semibold text-white/75 leading-snug">
            {item.program}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-orange mt-1">
            {item.date}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-white/50 leading-relaxed flex-1">
          {item.description}
        </p>

        {/* CTA */}
        <div className="pt-2">
          {item.isExternal ? (
            <a
              {...linkProps}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-sp-orange transition-colors group-hover:text-sp-orange"
              aria-label={`Escuchar ${item.program} en ${item.medium} (abre en nueva pestaña)`}
            >
              Escuchar episodio
              <ExternalArrow />
            </a>
          ) : (
            <Link
              {...linkProps}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-sp-orange transition-colors group-hover:text-sp-orange"
            >
              Leer más <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function PressSection() {
  if (APPEARANCES.length === 0) return null;

  return (
    <section className="bg-sp-black py-16 md:py-20" aria-labelledby="press-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-sp-orange mb-3">
              Prensa · Radio · Medios
            </p>
            <h2
              id="press-heading"
              className="font-display text-3xl md:text-4xl font-black uppercase text-white leading-[1.05]"
            >
              SocialPro en los{' '}
              <span className="gradient-text">medios</span>
            </h2>
          </div>
          <p className="text-sm text-white/35 max-w-xs leading-relaxed sm:text-right">
            Apariciones verificadas en medios de comunicación nacionales y especializados.
          </p>
        </div>

        {/* Cards grid — 1 col mobile, hasta 3 desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {APPEARANCES.map((item) => (
            <AppearanceCard key={item.id} item={item} />
          ))}
        </div>

      </div>
    </section>
  );
}
