'use client';

import { useRef, useTransition, useState } from 'react';
import { importCSVAction } from '@/app/admin/(dashboard)/targets/actions';

/**
 * Empty state para el listado de targets. Ofrece importar un CSV vía importCSVAction
 * cuando no hay ningún target todavía.
 *
 * @kind client
 * @feature admin/targets
 * @route /admin/targets
 */
export function TargetsEmptyState(): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; errors: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (): void => {
    const file = csvInputRef.current?.files?.[0];
    if (!file) return;
    setImportResult(null);
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      try {
        const res = await importCSVAction(fd);
        setImportResult({ inserted: res.inserted, updated: res.updated, errors: res.errors });
      } catch {
        setImportResult({ inserted: 0, updated: 0, errors: -1 });
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card/50 px-8 py-16 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-sp-admin-accent/10 flex items-center justify-center mb-4">
        <svg aria-hidden="true" className="w-6 h-6 text-sp-admin-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-sp-admin-text mb-1">Sin targets</p>
      <p className="text-xs text-sp-admin-muted mb-5 max-w-xs mx-auto">
        Importa un CSV con perfiles de creadores para empezar a gestionar tu pipeline de outreach.
      </p>
      <input ref={csvInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
      <button
        type="button"
        onClick={() => csvInputRef.current?.click()}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isPending ? 'Importando...' : 'Importar CSV'}
      </button>
      {importResult && (
        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          {importResult.errors === -1 ? (
            <span className="text-red-400">Error importando CSV</span>
          ) : (
            <>
              <span className="text-emerald-400">Importados: <strong>{importResult.inserted}</strong></span>
              {importResult.updated > 0 && <span className="text-blue-400">Actualizados: <strong>{importResult.updated}</strong></span>}
              {importResult.errors > 0 && <span className="text-red-400">Errores: <strong>{importResult.errors}</strong></span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
