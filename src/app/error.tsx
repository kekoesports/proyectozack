'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary global para Server Components y rutas no admin.
 *
 * Captura cualquier excepción no manejada en la jerarquía de rutas
 * (excluido el root layout en sí — para eso ver `global-error.tsx`).
 *
 * Reglas de seguridad:
 *   - NUNCA renderiza `error.message` ni stack trace al usuario.
 *   - Solo expone `error.digest` (ID server-generado, seguro de mostrar
 *     y útil para que soporte localice el error en logs).
 *   - Loggea solo `digest` y `name` por consola — nunca message ni stack.
 *
 * @kind client (requerido por Next.js para error boundaries)
 */
export default function GlobalAppError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    // safe: solo metadata; nunca error.message ni stack (pueden contener PII)
    console.error('[app/error]', { name: error.name, digest: error.digest ?? null });
  }, [error.name, error.digest]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-sp-orange mb-4">
        Algo no fue bien
      </p>
      <h1 className="font-display text-4xl sm:text-5xl font-black uppercase tracking-tight text-sp-dark leading-none mb-4">
        Página no disponible
      </h1>
      <p className="text-sp-muted text-base max-w-md mb-6">
        Ha ocurrido un error inesperado al cargar esta página. Puedes reintentar o volver al inicio.
      </p>

      {error.digest && (
        <p className="text-[11px] font-mono text-sp-muted/70 mb-8">
          Ref: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2.5 rounded-full border border-sp-border text-sm font-semibold text-sp-dark hover:border-sp-orange hover:text-sp-orange transition-colors"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
