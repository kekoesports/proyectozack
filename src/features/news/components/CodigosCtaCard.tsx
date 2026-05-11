import Link from 'next/link';

/**
 * CTA compacto al hub de códigos de descuento `/giveaways`. Complementa
 * la SorteosCtaCard (al top del aside) — esta va al bottom apuntando al
 * otro funnel (códigos de creators).
 */
export function CodigosCtaCard(): React.ReactElement {
  return (
    <section className="relative bg-sp-black border border-white/[0.08] rounded-2xl overflow-hidden p-5 md:p-6">
      <div
        aria-hidden
        className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(245,99,42,0.45), transparent 60%)' }}
      />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange mb-1.5">
          Códigos descuento
        </p>
        <h3 className="font-display font-black uppercase text-white text-xl tracking-tight leading-[1.0] mb-2.5">
          Usa el código de tu creator
        </h3>
        <p className="text-[12px] text-white/65 leading-snug mb-4">
          Compra con descuento en las marcas SocialPro · ahorra y apoya al creator.
        </p>
        <Link
          href="/giveaways"
          className="inline-flex items-center gap-1.5 border border-white/15 hover:border-sp-orange/40 hover:text-sp-orange text-white/85 text-[11px] font-bold uppercase tracking-wider rounded-full px-3.5 py-2 transition-colors group"
        >
          Ver códigos
          <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </section>
  );
}
