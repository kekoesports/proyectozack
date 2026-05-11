import type { EditorialQuote } from './types';

type Props = { readonly quote: EditorialQuote };

/**
 * Pull-quote estilo magazine — comillas grandes en gradient, texto display
 * grande. Restraint: 1 por artículo recomendado.
 */
export function EditorialQuoteBlock({ quote }: Props) {
  return (
    <figure className="relative max-w-3xl mx-auto px-5 md:px-8 mt-10 md:mt-14">
      <span
        aria-hidden
        className="absolute -top-2 md:-top-3 left-5 md:left-8 font-display font-black text-7xl md:text-8xl leading-none bg-sp-grad bg-clip-text text-transparent select-none pointer-events-none"
      >
        “
      </span>
      <blockquote className="relative pl-12 md:pl-16">
        <p className="font-display font-black uppercase tracking-tight text-xl md:text-3xl leading-[1.15] text-white">
          {quote.quote}
        </p>
        {quote.attribution || quote.context ? (
          <figcaption className="mt-4 md:mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {quote.attribution ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none">
                {quote.attribution}
              </span>
            ) : null}
            {quote.attribution && quote.context ? (
              <span aria-hidden className="text-white/20">·</span>
            ) : null}
            {quote.context ? (
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/45 leading-none">
                {quote.context}
              </span>
            ) : null}
          </figcaption>
        ) : null}
      </blockquote>
    </figure>
  );
}
