'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary del contexto admin `/admin/(dashboard)/**`.
 *
 * Captura excepciones no manejadas en cualquier ruta admin (talents,
 * brands, campanas, finanzas, etc.) y muestra una UI consistente con
 * el tema oscuro del CRM.
 *
 * Reglas de seguridad (idénticas a `app/error.tsx`):
 *   - NUNCA renderiza `error.message` ni stack trace.
 *   - Solo expone `error.digest` para que soporte localice el error.
 *   - Loggea solo metadata segura por consola.
 *
 * @kind client (requerido por Next.js)
 */
export default function AdminError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    // safe: solo metadata; nunca error.message ni stack
    console.error('[admin/error]', { name: error.name, digest: error.digest ?? null });
  }, [error.name, error.digest]);

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-12 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400 mb-3">
        Error en esta página
      </p>
      <h1 className="text-xl font-bold text-sp-admin-fg mb-2">
        No se pudo cargar el contenido
      </h1>
      <p className="text-sm text-sp-admin-muted max-w-md mx-auto mb-6">
        Ha ocurrido un error inesperado al cargar esta sección del panel.
        Puedes reintentar; si persiste, comparte la referencia con soporte.
      </p>

      {error.digest && (
        <p className="text-[11px] font-mono text-sp-admin-muted/70 mb-6">
          Ref: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-4 py-2 text-sm font-semibold text-sp-admin-fg hover:border-sp-orange/60 hover:text-sp-orange transition-colors"
        >
          Reintentar
        </button>
        <Link
          href="/admin"
          className="rounded-lg bg-sp-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Ir al inicio del panel
        </Link>
      </div>
    </div>
  );
}
