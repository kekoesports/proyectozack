import Link from 'next/link';

/**
 * Footer compartido de las páginas dinámicas de la plataforma
 * (`/sorteos/plataforma`, `/perfil`, `/creadores/[slug]`).
 * Incluye enlaces a los 4 documentos legales — pendientes de revisión —
 * para que estén accesibles desde cualquier pantalla del producto.
 */
export function PlatformFooter() {
  return (
    <footer className="gp-footer">
      <p className="gp-footer-tagline">
        <b>SOCIALPRO GIVEAWAYS</b> · Sorteos gratuitos de creadores · Sin apuestas · +18 ·
        Juega con responsabilidad
      </p>
      <nav className="gp-footer-links" aria-label="Enlaces legales">
        <Link href="/sorteos/faq">FAQ</Link>
        <Link href="/sorteos/terminos">Términos</Link>
        <Link href="/sorteos/privacidad">Privacidad</Link>
        <Link href="/sorteos/juego-responsable">Juego responsable</Link>
      </nav>
    </footer>
  );
}
