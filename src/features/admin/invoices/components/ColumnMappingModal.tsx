'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { commitMappedImportAction } from '@/app/admin/(dashboard)/facturacion/import/import-actions';
import { extractXlsxSheet } from '@/lib/parsers/xlsx';
import { extractCsvSheet } from '@/lib/parsers/csv';
import {
  MAPPABLE_FIELDS,
  suggestMapping,
  type ColumnMapping,
} from '@/lib/parsers/common';
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FIELD_LABEL,
  HiddenFileInput,
  INPUT,
  LABEL,
  matchesTemplate,
  type Source,
} from './ColumnMappingModal.parts';
import type { ImportTemplate } from '@/lib/queries/invoiceImportTemplates';

type ColumnMappingModalProps = {
  readonly file: File;
  readonly source: Source;
  readonly templates: readonly ImportTemplate[];
  readonly onCloseAction: () => void;
};

/**
 * Modal del flujo de import de facturas que permite mapear columnas del fichero (CSV/XLSX) a campos canónicos.
 *
 * @kind client
 * @feature admin/invoices
 * @route /admin/facturacion/import
 */
export function ColumnMappingModal({
  file,
  source,
  templates,
  onCloseAction,
}: ColumnMappingModalProps): React.ReactElement {
  const [headers, setHeaders] = useState<readonly string[]>([]);
  const [samples, setSamples] = useState<readonly (readonly string[])[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(commitMappedImportAction, {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const extract =
          source === 'xlsx'
            ? extractXlsxSheet(await file.arrayBuffer())
            : extractCsvSheet(await file.text());
        if (cancelled) return;
        setHeaders(extract.headers);
        setSamples(extract.rows.slice(0, 5));
        setRowCount(extract.rows.length);

        const matching = templates
          .map((t) => ({ t, score: matchesTemplate(extract.headers, t.sampleHeaders) }))
          .filter((m) => m.score >= 0.7)
          .sort((a, b) => b.score - a.score)[0];
        setMapping(matching ? matching.t.columnMapping : suggestMapping(extract.headers));
      } catch (err) {
        if (!cancelled) setPreviewError(err instanceof Error ? err.message : 'Error leyendo archivo');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, source, templates]);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(onCloseAction, 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.success, onCloseAction]);

  const mappingJson = useMemo(() => JSON.stringify(mapping), [mapping]);
  const columnOptions = useMemo(
    () => headers.map((h, i) => ({ idx: i, label: h || `Columna ${i + 1}` })),
    [headers],
  );

  const applyTemplate = (id: number): void => {
    const t = templates.find((x) => x.id === id);
    if (t) setMapping(t.columnMapping);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-sp-admin-card border border-sp-admin-border rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border">
          <div>
            <h2 className="font-display text-xl font-black uppercase text-sp-admin-text">
              Mapear columnas
            </h2>
            <p className="text-xs text-sp-admin-muted mt-0.5">
              {file.name} · {source.toUpperCase()} · {rowCount} filas detectadas
            </p>
          </div>
          <button type="button" onClick={onCloseAction} className={BTN_GHOST}>
            Cerrar
          </button>
        </div>

        {previewError ? (
          <div className="p-6 text-sm text-red-400">Error leyendo archivo: {previewError}</div>
        ) : headers.length === 0 ? (
          <div className="p-6 text-sm text-sp-admin-muted">Leyendo archivo…</div>
        ) : (
          <form action={formAction} className="flex-1 overflow-auto">
            <HiddenFileInput file={file} />
            <input type="hidden" name="mapping" value={mappingJson} />
            <input type="hidden" name="kind" value={kind} />

            <div className="p-6 space-y-6">
              {templates.length > 0 && (
                <div>
                  <label className={LABEL}>Aplicar plantilla guardada</label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) applyTemplate(id);
                    }}
                    className={INPUT}
                  >
                    <option value="">— ninguna —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-sp-admin-text">Mapear campos</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">Tipo:</label>
                    <select value={kind} onChange={(e) => setKind(e.target.value as 'income' | 'expense')} className={`${INPUT} w-auto`}>
                      <option value="expense">Gastos</option>
                      <option value="income">Ingresos</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MAPPABLE_FIELDS.map((field) => (
                    <div key={field}>
                      <label className={LABEL}>{FIELD_LABEL[field]}</label>
                      <select
                        value={mapping[field] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMapping((prev) => {
                            const next = { ...prev };
                            if (val === '') delete next[field];
                            else next[field] = Number(val);
                            return next;
                          });
                        }}
                        className={INPUT}
                      >
                        <option value="">— no usar —</option>
                        {columnOptions.map((c) => (
                          <option key={c.idx} value={c.idx}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-sp-admin-text mb-2">Muestra (primeras 5 filas)</h3>
                <div className="rounded-xl border border-sp-admin-border overflow-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-sp-admin-bg/60">
                        {headers.map((h, i) => (
                          <th
                            key={i}
                            className="text-left px-3 py-2 font-semibold text-sp-admin-muted border-b border-sp-admin-border whitespace-nowrap"
                          >
                            <span className="font-mono text-[10px] text-sp-admin-accent">{String.fromCharCode(65 + i)}</span>
                            <span className="ml-2">{h || `(col ${i + 1})`}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {samples.map((row, ri) => (
                        <tr key={ri} className="border-b border-sp-admin-border/50 last:border-0">
                          {headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-2 text-sp-admin-text whitespace-nowrap">
                              {row[ci] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-sp-admin-border bg-sp-admin-bg/40 p-4">
                <label className="flex items-center gap-2 text-sm text-sp-admin-text">
                  <input
                    type="checkbox"
                    name="saveAsTemplate"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  />
                  Guardar como plantilla para próximos archivos similares
                </label>
                {saveAsTemplate && (
                  <div className="mt-3">
                    <label className={LABEL}>Nombre de la plantilla</label>
                    <input
                      name="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Stripe payouts, Holded export..."
                      className={INPUT}
                    />
                  </div>
                )}
              </div>

              {state.error && <p className="text-xs text-red-400">{state.error}</p>}
              {state.success && (
                <p className="text-xs text-emerald-400">
                  {state.createdCount} fila(s) creadas en cola{state.skippedCount ? ` · ${state.skippedCount} saltada(s) por duplicado` : ''}.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-sp-admin-border bg-sp-admin-bg/40">
              <button type="button" onClick={onCloseAction} className={BTN_GHOST}>
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
                {isPending ? 'Procesando…' : `Crear ${rowCount} imports`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
