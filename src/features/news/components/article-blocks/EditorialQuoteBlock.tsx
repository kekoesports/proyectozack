import type { EditorialQuote } from './types';

type Props = { readonly quote: EditorialQuote };

/**
 * Pull-quote estilo magazine. Vertical accent bar gradient (sp-grad) + texto
 * display grande. No es un card contenido — fluye con el body para
 * "sensación editorial", no callout aislado.
 */
export function EditorialQuoteBlock({ quote }: Props) {
  return (
    <figure className="max-w-3xl mx-auto px-5 md:px-8 my-12 md:my-16">
      <div className="flex gap-5 md:gap-8">
        <span
          aria-hidden
          className="flex-none w-1 md:w-1.5 self-stretch rounded-full bg-sp-grad"
        />
        <blockquote className="flex-1 min-w-0">
          <p className="font-display font-black uppercase tracking-tight text-2xl md:text-[40px] leading-[1.05] text-white">
            {quote.quote}
          </p>
          {quote.attribution || quote.context ? (
            <figcaption className="mt-5 md:mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
      </div>
    </figure>
  );
}
