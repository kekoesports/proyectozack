import Link from 'next/link';

type Props = {
  readonly tone?: 'dark' | 'paper';
};

/**
 * CTA compacto al hub público `/sorteos`. Gradient sp-grad + label corto +
 * botón. Diseñado para sidebar (NewsAside) o inline-card (home / artículo).
 * Sin counter dinámico (manténte fast / cero queries extra).
 */
export function SorteosCtaCard({ tone: _tone = 'dark' }: Props = {}): React.ReactElement {
  return (
    <section className="relative bg-sp-grad rounded-2xl overflow-hidden p-5 md:p-6 shadow-[0_8px_28px_rgba(245,99,42,0.18)]">
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.55), transparent 60%)' }}
      />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/85 mb-1.5">
          Sorteos activos
        </p>
        <h3 className="font-display font-black uppercase text-white text-xl md:text-2xl tracking-tight leading-[1.0] mb-2.5">
          Gana skins CS2
        </h3>
        <p className="text-[12px] md:text-[13px] text-white/90 leading-snug mb-4">
          Sorteos gratis de tus creators favoritos. Sin trampas, sin coste.
        </p>
        <Link
          href="/sorteos"
          className="inline-flex items-center gap-1.5 bg-sp-black/40 hover:bg-sp-black/65 backdrop-blur text-white text-[11px] font-bold uppercase tracking-wider rounded-full px-3.5 py-2 transition-colors group"
        >
          Ver sorteos
          <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </section>
  );
}
