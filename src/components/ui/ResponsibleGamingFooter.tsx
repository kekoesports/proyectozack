import Link from 'next/link';

/**
 * Footer de juego responsable — obligatorio en páginas con contenido iGaming.
 * Spec F7: mensaje visible, link a jugarbien.es y a términos.
 */
export function ResponsibleGamingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black/30 py-5 mt-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
          +18 · Juega con responsabilidad
        </p>
        <p className="text-[10px] text-white/15 leading-relaxed max-w-2xl mx-auto">
          Los sorteos y códigos de esta página están destinados a mayores de 18 años.
          Si el juego te está causando problemas, busca ayuda en{' '}
          <a
            href="https://www.jugarbien.es"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/30 transition-colors"
          >
            jugarbien.es
          </a>
          {' '}o llama al{' '}
          <a href="tel:900200225" className="underline hover:text-white/30 transition-colors">
            900 200 225
          </a>
          {' '}(gratuito, 24h).
        </p>
        <Link
          href="/terminos-sorteos"
          className="inline-block text-[10px] text-white/15 hover:text-white/30 underline transition-colors"
        >
          Términos y condiciones de los sorteos
        </Link>
      </div>
    </footer>
  );
}
