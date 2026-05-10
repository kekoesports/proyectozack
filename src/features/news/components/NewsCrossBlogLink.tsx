import Link from 'next/link';

export function NewsCrossBlogLink() {
  return (
    <section className="relative bg-sp-off py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 md:gap-12 items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-sp-orange mb-3">
              Más allá de las news
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-black uppercase text-sp-dark tracking-tight leading-[1.0] mb-3">
              Casos de éxito y operativa de agencia<br className="hidden md:block" />
              <span className="bg-sp-grad bg-clip-text text-transparent">en SocialPro Blog</span>
            </h2>
            <p className="text-sm md:text-base text-sp-muted leading-relaxed max-w-xl">
              Aquí está la actualidad. Si buscas el detrás de cámaras de las
              campañas, partnerships y datos de cada activación, ese contenido
              vive en el blog corporativo.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 self-start md:self-center border border-sp-dark/15 text-sp-dark font-display font-bold uppercase tracking-wider text-sm px-7 py-3.5 rounded-full hover:border-sp-dark/30 hover:bg-sp-dark/5 transition-colors whitespace-nowrap"
          >
            Ir al Blog SocialPro
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
