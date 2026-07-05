import Link from 'next/link';

/**
 * Footer compartido de las páginas dinámicas de la plataforma
 * (`/sorteos/plataforma`, `/perfil`, `/creadores/[slug]`).
 * Incluye enlaces a los documentos legales — pendientes de revisión —
 * para que estén accesibles desde cualquier pantalla del producto.
 *
 * Fase 0 legal:
 *   - `Juego responsable` renombrado a `Participación responsable` para
 *     no autocalificar SocialPro como operador de juego (ver
 *     docs/legal-risk-matrix.md). La ruta antigua sigue disponible
 *     con redirect 301.
 *   - Añadidos enlaces a `Recompensas y puntos`, `Bases de sorteos` y
 *     `Partners externos`.
 */
export function PlatformFooter() {
  return (
    <footer className="gp-footer">
      <p className="gp-footer-tagline">
        <b>SOCIALPRO GIVEAWAYS</b> · Sorteos gratuitos de creadores · Sin apuestas · +18 ·
        Participa con responsabilidad
      </p>
      <nav className="gp-footer-links" aria-label="Enlaces legales">
        <Link href="/sorteos/faq">FAQ</Link>
        <Link href="/sorteos/recompensas-y-puntos">Recompensas y puntos</Link>
        <Link href="/sorteos/terminos">Términos</Link>
        <Link href="/sorteos/privacidad">Privacidad</Link>
        <Link href="/sorteos/participacion-responsable">Participación responsable</Link>
        <Link href="/sorteos/partners-externos">Partners externos</Link>
        <Link href="/contacto">Contacto</Link>
      </nav>
    </footer>
  );
}
