'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { applyStatsImportAction } from '@/app/admin/(dashboard)/stats/import-actions';
import { parseSheetRows, diffAgainstRoster, type CurrentTalent } from '@/lib/utils/statsImport';
import {
  BTN_GHOST,
  BTN_PRIMARY,
  STATUS_LABELS,
  STATUS_STYLES,
  type ImportResult,
} from './StatsImportPanel.parts';

type Props = {
  readonly roster: readonly CurrentTalent[];
};

/**
 * Panel de import de snapshots de stats desde un fichero. Permite previsualizar las filas,
 * aceptar selectivamente cuáles importar y muestra resultado (created/updated/skipped).
 *
 * @kind client
 * @feature admin/stats
 * @route /admin/talents/[id]/stats
 */
export function StatsImportPanel({ roster }: Props): React.ReactElement {
  const [rawRows, setRawRows] = useState<Record<string, unknown>[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const diff = useMemo(() => {
    if (!rawRows) return [];
    const parsed = parseSheetRows(rawRows);
    return diffAgainstRoster(parsed, roster);
  }, [rawRows, roster]);

  const counts = useMemo(() => {
    const c = { new: 0, updated: 0, unchanged: 0, 'no-talent-match': 0, 'no-social-match': 0 };
    for (const r of diff) c[r.status]++;
    return c;
  }, [diff]);

  const visibleDiff = useMemo(() => {
    if (!showOnlyChanges) return diff;
    return diff.filter((r) => r.status === 'new' || r.status === 'updated' || r.status === 'no-talent-match');
  }, [diff, showOnlyChanges]);

  const onFile = async (file: File): Promise<void> => {
    setParseError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        setParseError('El archivo no contiene hojas');
        return;
      }
      const sheet = wb.Sheets[sheetName];
      if (!sheet) {
        setParseError('No se pudo leer la primera hoja');
        return;
      }
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      setRawRows(json);

      // Pre-select all rows that would actually change something
      const parsed = parseSheetRows(json);
      const computed = diffAgainstRoster(parsed, roster);
      const toAccept = new Set<number>();
      for (const r of computed) {
        if (r.status === 'new' || r.status === 'updated') toAccept.add(r.rowIndex);
      }
      setAccepted(toAccept);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      setParseError(`Error leyendo el archivo: ${msg}`);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void onFile(file);
  };

  const reset = (): void => {
    setRawRows(null);
    setFileName(null);
    setAccepted(new Set());
    setParseError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleRow = (rowIndex: number): void => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const acceptAllChanges = (): void => {
    const next = new Set<number>();
    for (const r of diff) {
      if (r.status === 'new' || r.status === 'updated') next.add(r.rowIndex);
    }
    setAccepted(next);
  };

  const acceptNone = (): void => setAccepted(new Set());

  const onApply = (): void => {
    if (!rawRows || accepted.size === 0) return;
    startTransition(async () => {
      const res = await applyStatsImportAction({
        rows: rawRows,
        acceptedRowIndices: [...accepted],
      });
      setResult(res);
      if (res.success) {
        // Keep the diff visible but disable further apply by clearing accepted
        setAccepted(new Set());
      }
    });
  };

  if (!rawRows) {
    return (
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm">Importar estadísticas</h2>
        <p className="text-xs text-sp-admin-muted mt-1 mb-4">
          Sube un Excel (.xlsx) o CSV con columnas: <code className="text-sp-admin-text">Talent, Plataforma, Handle, Followers, URL perfil, CCV</code>.
          Verás el diff antes de aplicar nada.
        </p>
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-sp-admin-border bg-sp-admin-bg p-8 text-center"
        >
          <p className="text-sm text-sp-admin-muted mb-3">Arrastra el archivo aquí o</p>
          <label className={`${BTN_PRIMARY} inline-block`}>
            Elegir archivo
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>
        </div>
        {parseError && <p className="text-xs text-red-400 mt-3">{parseError}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-sp-admin-text text-sm">Importar estadísticas — preview</h2>
          <p className="text-xs text-sp-admin-muted mt-1">
            <span className="font-semibold text-sp-admin-text">{fileName}</span>
            {' · '}
            {diff.length} filas
            {' · '}
            <span className="text-blue-400">{counts.new} nuevas</span>
            {' · '}
            <span className="text-amber-400">{counts.updated} a actualizar</span>
            {' · '}
            <span className="text-slate-400">{counts.unchanged} sin cambios</span>
            {counts['no-talent-match'] > 0 && (
              <>{' · '}<span className="text-red-400">{counts['no-talent-match']} sin match</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className={BTN_GHOST}>Cancelar</button>
          <button
            type="button"
            onClick={onApply}
            disabled={accepted.size === 0 || isPending}
            className={BTN_PRIMARY}
          >
            {isPending ? 'Aplicando...' : `Aplicar ${accepted.size} cambio${accepted.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-sp-admin-muted cursor-pointer">
          <input type="checkbox" checked={showOnlyChanges} onChange={(e) => setShowOnlyChanges(e.target.checked)} />
          Solo mostrar filas con cambios o problemas
        </label>
        <span className="text-xs text-sp-admin-muted">·</span>
        <button type="button" onClick={acceptAllChanges} className={BTN_GHOST}>Aceptar todas</button>
        <button type="button" onClick={acceptNone} className={BTN_GHOST}>Limpiar selección</button>
      </div>

      {result && (
        <div className={`rounded-xl border p-3 text-xs ${result.error ? 'border-red-500/30 bg-red-500/5 text-red-400' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'}`}>
          {result.error
            ? `Error: ${result.error}`
            : `Aplicados ${result.applied ?? 0} cambios (${result.created ?? 0} nuevos · ${result.updated ?? 0} actualizados · ${result.skipped ?? 0} omitidos).`}
        </div>
      )}

      <div className="rounded-xl border border-sp-admin-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
              <th className="px-3 py-2 text-left font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider w-10">✓</th>
              <th className="px-3 py-2 text-left font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider">Estado</th>
              <th className="px-3 py-2 text-left font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider">Talent</th>
              <th className="px-3 py-2 text-left font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider">Red</th>
              <th className="px-3 py-2 text-left font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider">Cambios</th>
            </tr>
          </thead>
          <tbody>
            {visibleDiff.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sp-admin-muted italic">Nada que mostrar.</td></tr>
            ) : (
              visibleDiff.map((row) => {
                const canAccept = row.status === 'new' || row.status === 'updated';
                const isOn = accepted.has(row.rowIndex);
                return (
                  <tr key={row.rowIndex} className="border-b border-sp-admin-border/40 hover:bg-sp-admin-hover/40">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isOn}
                        disabled={!canAccept}
                        onChange={() => toggleRow(row.rowIndex)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[row.status]}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sp-admin-text font-medium">{row.parsed.talentName}</td>
                    <td className="px-3 py-2 text-sp-admin-muted capitalize">{row.parsed.platform}</td>
                    <td className="px-3 py-2">
                      {row.changes.length === 0 ? (
                        <span className="text-sp-admin-muted italic">{row.status === 'no-talent-match' ? 'Talent no existe en el roster' : '—'}</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {row.changes.map((c, i) => (
                            <li key={i}>
                              <span className="text-sp-admin-muted">{c.field}: </span>
                              <span className="text-red-400 line-through">{c.before ?? '∅'}</span>
                              <span className="text-sp-admin-muted mx-1">→</span>
                              <span className="text-emerald-400 font-medium">{c.after ?? '∅'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
