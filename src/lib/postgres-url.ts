const LEGACY_STRICT_SSL_MODES = new Set(['prefer', 'require', 'verify-ca']);

/**
 * Hace explícita la semántica TLS que `pg` aplica hoy a las URLs de Neon.
 *
 * `pg-connection-string` avisa de que `prefer`, `require` y `verify-ca`
 * dejarán de significar `verify-full` en su próxima versión mayor. Mantener el
 * comportamiento implícito convertiría una actualización de dependencia en
 * una reducción silenciosa de la verificación TLS.
 *
 * Las URLs del PostgreSQL local del VPS no llevan `sslmode` y se devuelven sin
 * tocar. Si alguien pide expresamente compatibilidad libpq, también se respeta.
 */
export function normalizePostgresSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get('sslmode');

  if (
    sslMode
    && LEGACY_STRICT_SSL_MODES.has(sslMode)
    && url.searchParams.get('uselibpqcompat') !== 'true'
  ) {
    url.searchParams.set('sslmode', 'verify-full');
    return url.toString();
  }

  return connectionString;
}
