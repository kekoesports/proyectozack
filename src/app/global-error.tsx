'use client';

import { useEffect } from 'react';

/**
 * Error boundary del root layout. Se activa SOLO cuando falla algo dentro
 * del propio `app/layout.tsx` (fuente, providers, etc.) — el catch normal
 * `app/error.tsx` NO captura errores del root layout en sí.
 *
 * Debe incluir `<html>` y `<body>` propios porque reemplaza al root layout
 * cuando este ha fallado (Next.js docs).
 *
 * Reglas de seguridad:
 *   - NUNCA renderiza `error.message` ni stack trace.
 *   - Solo expone `error.digest` para que soporte localice el error en logs.
 *   - Sin chrome del sitio (puede ser que el chrome sea exactamente lo roto).
 *   - HTML mínimo, sin dependencias externas, sin fuentes custom.
 *
 * @kind client (requerido por Next.js)
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    // safe: solo metadata; nunca error.message ni stack
    console.error('[global-error]', { name: error.name, digest: error.digest ?? null });
  }, [error.name, error.digest]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: '#0f0f0f',
          color: '#e8e8e8',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#f5632a',
            marginBottom: 16,
          }}
        >
          Algo no fue bien
        </p>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            textTransform: 'uppercase',
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
          }}
        >
          Página no disponible
        </h1>
        <p style={{ maxWidth: 480, opacity: 0.7, marginBottom: 24 }}>
          Ha ocurrido un error inesperado. Puedes reintentar o recargar.
        </p>
        {error.digest && (
          <p
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
              fontSize: 11,
              opacity: 0.55,
              marginBottom: 24,
            }}
          >
            Ref: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '12px 32px',
            borderRadius: 9999,
            border: 0,
            background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
            color: '#fff',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
