'use client';

import { useState, useRef, useTransition } from 'react';
import { importCSVAction } from '@/app/admin/(dashboard)/targets/actions';

const TWITCH_PURPLE = '#9146FF';

/**
 * Buscador de canales en la API de Twitch que permite filtrar por idioma, juego y followers
 * y luego importar los seleccionados como targets vía importCSVAction.
 *
 * @kind client
 * @feature admin/targets
 * @route /admin/targets
 */
export function TwitchSearch(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    total: number;
    inserted: number;
    updated: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (): void => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.set('file', file);

    startTransition(async () => {
      try {
        const res = await importCSVAction(fd);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error importando CSV');
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    });
  };

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-sp-admin-hover transition-colors text-left"
      >
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: TWITCH_PURPLE }}
        >
          <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-sp-admin-text leading-none">Importar canales de Twitch</p>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">
            Sube un CSV con canales de Twitch para importar
          </p>
        </div>

        {isPending && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wide animate-pulse shrink-0"
            style={{ color: TWITCH_PURPLE }}
          >
            Importando...
          </span>
        )}

        <svg
          aria-hidden="true"
          className={`w-4 h-4 text-sp-admin-muted transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-sp-admin-border px-5 py-4 space-y-3">
          <p className="text-[11px] text-sp-admin-muted">
            Columnas requeridas: <code className="text-sp-admin-text">username</code>.
            Opcionales: <code className="text-sp-admin-text">platform</code>, <code className="text-sp-admin-text">full_name</code>, <code className="text-sp-admin-text">followers</code>, <code className="text-sp-admin-text">biography</code>, etc.
          </p>

          <div className="flex items-center gap-2.5">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="text-sm text-sp-admin-text file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[12px] file:font-bold file:text-white file:cursor-pointer hover:file:opacity-90 file:bg-[#9146FF]"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={isPending}
              className="shrink-0 px-5 py-2 rounded-lg text-white text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: TWITCH_PURPLE }}
            >
              {isPending ? 'Importando...' : 'Importar'}
            </button>
          </div>

          {result && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400">
                Importados: <strong>{result.inserted}</strong>
              </span>
              {result.updated > 0 && (
                <span className="text-blue-400">
                  Actualizados: <strong>{result.updated}</strong>
                </span>
              )}
              {result.errors > 0 && (
                <span className="text-red-400">
                  Errores: <strong>{result.errors}</strong>
                </span>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
