import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: true },
};

const NAV_LINKS = [
  { href: '/talentos', label: 'Talentos' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/casos', label: 'Casos de Éxito' },
  { href: '/blog', label: 'Blog' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

/**
 * Página 404 global con chrome del sitio y links a las secciones principales.
 *
 * @kind server
 * @route /* (fallback)
 */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-sp-orange mb-4">
        Error 404
      </p>
      <h1 className="font-display text-5xl sm:text-6xl font-black uppercase tracking-tight text-sp-dark leading-none mb-4">
        Página no encontrada
      </h1>
      <p className="text-sp-muted text-base max-w-md mb-10">
        La URL que buscas no existe o ha sido movida. Explora el resto del sitio desde aquí.
      </p>

      <nav aria-label="Páginas principales" className="flex flex-wrap justify-center gap-3 mb-10">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-5 py-2.5 rounded-full border border-sp-border text-sm font-semibold text-sp-dark hover:border-sp-orange hover:text-sp-orange transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      <Link
        href="/"
        className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
