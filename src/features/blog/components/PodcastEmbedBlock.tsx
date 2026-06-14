export type PodcastBlock = {
  readonly episodeTitle: string;
  readonly showName: string;
  readonly network: string;
  readonly host?: string;
  readonly date: string;
  readonly audioUrl: string;
  readonly showUrl?: string;
  readonly duration?: string;
  readonly description?: string;
};

type Props = { readonly podcast: PodcastBlock };

export function PodcastEmbedBlock({ podcast }: Props) {
  return (
    <section
      className="my-10 md:my-14 rounded-2xl overflow-hidden border border-white/10 bg-sp-black"
      aria-label={`Episodio de podcast: ${podcast.showName}`}
    >
      {/* Header — network + show */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/[0.06]">
        <span
          className="flex-none w-11 h-11 rounded-full bg-sp-grad flex items-center justify-center"
          aria-hidden="true"
        >
          <HeadphonesIcon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-sm md:text-base text-white uppercase leading-none truncate">
            {podcast.network}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 mt-1.5 leading-none">
            {podcast.showName}
            {podcast.host ? <> · {podcast.host}</> : null}
          </p>
        </div>
        {podcast.duration ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 hidden sm:block flex-none">
            {podcast.duration}
          </span>
        ) : null}
      </div>

      {/* Episode content */}
      <div className="px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-orange mb-2">
          {podcast.date}
        </p>
        <p className="font-display font-black uppercase text-white text-lg md:text-xl leading-[1.2]">
          {podcast.episodeTitle}
        </p>
        {podcast.description ? (
          <p className="text-sm text-white/55 mt-3 leading-relaxed">
            {podcast.description}
          </p>
        ) : null}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-between gap-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 leading-none">
          Radio · España
        </p>
        <a
          href={podcast.audioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sp-orange hover:text-white transition-colors"
        >
          Escuchar episodio
          <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">→</span>
        </a>
      </div>
    </section>
  );
}

function HeadphonesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
      aria-hidden="true"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}
