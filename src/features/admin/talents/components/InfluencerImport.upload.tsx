'use client';

import type { RefObject } from 'react';
import { TALENT_FIELDS, PREVIEW_ROWS } from './InfluencerImport.parts';

export function UploadStep({
  isPending,
  uploadError,
  fileInputRef,
  onFileChange,
  onSubmit,
}: {
  readonly isPending: boolean;
  readonly uploadError: string | null;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly onFileChange: () => void;
  readonly onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-3">
        <h3 className="font-bold text-sp-admin-text text-sm">Importar y cruzar documento</h3>
        <p className="text-xs text-sp-admin-muted">
          Sube un archivo <code className="font-mono bg-sp-admin-bg px-1 py-0.5 rounded">.csv</code> o{' '}
          <code className="font-mono bg-sp-admin-bg px-1 py-0.5 rounded">.xlsx</code>.
          El sistema cruzara los datos del documento con los influencers que ya tenemos en la base de datos.
        </p>
        <p className="text-xs text-sp-admin-muted">
          Podras ver las coincidencias, diferencias, nuevos creadores y los que solo estan en nuestra BD.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5"
      >
        <label className="block text-xs uppercase tracking-wider font-semibold text-sp-admin-muted mb-2">
          Archivo CSV o Excel (max 5MB)
        </label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            onChange={onFileChange}
            className="flex-1 text-sm text-sp-admin-text file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-accent file:text-sp-admin-bg file:px-4 file:py-2 file:text-xs file:font-bold file:cursor-pointer"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {isPending ? 'Leyendo...' : 'Siguiente'}
          </button>
        </div>
        {uploadError && <p className="text-xs text-red-400 mt-3">{uploadError}</p>}
      </form>
    </div>
  );
}

export function MappingStep({
  headers,
  allRows,
  mapping,
  isPending,
  onMappingChange,
  onReset,
  onNext,
}: {
  readonly headers: readonly string[];
  readonly allRows: readonly Record<string, string>[];
  readonly mapping: Record<string, string>;
  readonly isPending: boolean;
  readonly onMappingChange: (header: string, value: string) => void;
  readonly onReset: () => void;
  readonly onNext: () => void;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sp-admin-text text-sm">Mapeo de columnas</h3>
            <p className="text-xs text-sp-admin-muted mt-0.5">
              {headers.length} columnas detectadas / {allRows.length} filas
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
            >
              Volver
            </button>
            <button
              onClick={onNext}
              disabled={isPending}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Cruzando datos...' : 'Cruzar con BD'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {headers.map((header) => (
            <div key={header} className="flex items-center gap-3">
              <div className="w-48 shrink-0">
                <span className="text-xs font-mono text-sp-admin-text bg-sp-admin-bg border border-sp-admin-border rounded px-2 py-1 block truncate">
                  {header}
                </span>
              </div>
              <span className="text-sp-admin-muted text-xs">-&gt;</span>
              <select
                value={mapping[header] ?? '(ignorar)'}
                onChange={(e) => onMappingChange(header, e.target.value)}
                className="flex-1 text-xs bg-sp-admin-bg border border-sp-admin-border rounded px-2 py-1 text-sp-admin-text focus:outline-none focus:border-sp-admin-accent"
              >
                {TALENT_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Preview of first rows */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        <div className="border-b border-sp-admin-border px-4 py-3">
          <h4 className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">
            Vista previa (primeras {Math.min(PREVIEW_ROWS, allRows.length)} filas)
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sp-admin-bg/50 border-b border-sp-admin-border">
                {headers.map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-sp-admin-muted whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <tr key={i} className="border-b border-sp-admin-border/50 last:border-0">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 text-sp-admin-muted max-w-[160px] truncate">
                      {row[h] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
