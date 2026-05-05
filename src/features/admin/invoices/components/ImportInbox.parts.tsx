'use client';

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  uploadImportAction,
  approveImportAction,
  rejectImportAction,
} from '@/app/admin/(dashboard)/facturacion/import/import-actions';
import type { InvoiceImportWithDraft, InvoiceImportStatus } from '@/types';
import { INVOICE_STATUSES } from '@/lib/schemas/invoice';
import type { ImportTemplate } from '@/lib/queries/invoiceImportTemplates';
import { ColumnMappingModal } from './ColumnMappingModal';

export type BrandOption = { readonly id: number; readonly name: string };
export type TalentOption = { readonly id: number; readonly name: string };

export const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
export const LABEL = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
export const BTN_PRIMARY =
  'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
export const BTN_GHOST =
  'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';
export const BTN_DANGER =
  'px-3 py-1.5 rounded-full text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer';

export const STATUS_LABEL: Record<InvoiceImportStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const STATUS_STYLE: Record<InvoiceImportStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export function formatDateTime(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

export function EmptyState({ message }: { readonly message: string }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-dashed border-sp-admin-border p-8 text-center">
      <p className="text-sm text-sp-admin-muted">{message}</p>
    </div>
  );
}

function getSheetSource(file: File): 'xlsx' | 'csv' | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'csv') return 'csv';
  if (file.type === 'text/csv') return 'csv';
  if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  return null;
}

export function UploadCard({ templates }: { readonly templates: readonly ImportTemplate[] }): React.ReactElement {
  const [state, formAction, isPending] = useActionState(uploadImportAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [sheetFile, setSheetFile] = useState<{ file: File; source: 'xlsx' | 'csv' } | null>(null);

  useEffect(() => {
    if (state.success && !isPending) {
      formRef.current?.reset();
    }
  }, [state.success, state.importId, isPending]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sheet = getSheetSource(file);
    if (sheet) {
      setSheetFile({ file, source: sheet });
    }
  };

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-3"
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className={LABEL}>Archivo (PDF, XLSX, CSV, XML — máx 10 MB)</label>
            <input
              name="file"
              type="file"
              required
              accept="application/pdf,.xlsx,.xls,.csv,.xml,text/csv,application/xml,text/xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={onFileChange}
              className={`${INPUT} file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-bg file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sp-admin-text`}
            />
            <p className="text-[10px] text-sp-admin-muted mt-1">
              Los XLSX / CSV abren un mapping de columnas antes de entrar en cola.
            </p>
          </div>
          <button type="submit" disabled={isPending || sheetFile !== null} className={BTN_PRIMARY}>
            {isPending ? 'Subiendo…' : 'Subir a revisión'}
          </button>
        </div>
        {state.error && <p className="text-xs text-red-400">{state.error}</p>}
        {state.success && state.importId && (
          <p className="text-xs text-emerald-400">Archivo subido como #{state.importId}. Complétalo abajo.</p>
        )}
      </form>

      {sheetFile && (
        <ColumnMappingModal
          file={sheetFile.file}
          source={sheetFile.source}
          templates={templates.filter((t) => t.sourceType === sheetFile.source)}
          onCloseAction={() => {
            setSheetFile(null);
            formRef.current?.reset();
          }}
        />
      )}
    </>
  );
}

type PendingRowProps = {
  readonly imp: InvoiceImportWithDraft;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly categories: readonly string[];
  readonly isOpen: boolean;
  readonly onToggle: () => void;
};

export function PendingRow({
  imp,
  brands,
  talents,
  categories,
  isOpen,
  onToggle,
}: PendingRowProps): React.ReactElement {
  const [isRejecting, startReject] = useTransition();

  const onReject = (): void => {
    if (!confirm('¿Rechazar este import? No se creará factura.')) return;
    startReject(async () => {
      await rejectImportAction(imp.id);
    });
  };

  return (
    <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sp-admin-bg text-sp-admin-muted font-mono">
            {imp.sourceType}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-sp-admin-text truncate">
              {imp.fileUrl ? (
                <a href={imp.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  {imp.sourceFilename}
                </a>
              ) : (
                imp.sourceFilename
              )}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-sp-admin-muted">
              Subido {formatDateTime(imp.createdAt)} · #{imp.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onToggle} className={BTN_GHOST}>
            {isOpen ? 'Cerrar' : 'Revisar'}
          </button>
          <button type="button" onClick={onReject} disabled={isRejecting} className={BTN_DANGER}>
            Rechazar
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="border-t border-sp-admin-border bg-sp-admin-bg/40">
          {imp.warnings && imp.warnings.length > 0 && (
            <div className="px-5 pt-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 mb-1">Avisos del parser</p>
                <ul className="text-xs text-amber-300 list-disc list-inside space-y-0.5">
                  {imp.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}
          <div>
            {imp.sourceType === 'pdf-text' && imp.fileUrl && (
              <div className="px-5 pt-4 pb-0">
                <a
                  href={imp.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:border-sp-admin-accent/50 transition-colors"
                >
                  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Abrir PDF en nueva pestaña
                </a>
              </div>
            )}
            <div className="px-5 py-5">
              <ImportReviewForm
                imp={imp}
                brands={brands}
                talents={talents}
                categories={categories}
                onDone={onToggle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ReviewFormProps = {
  readonly imp: InvoiceImportWithDraft;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly categories: readonly string[];
  readonly onDone: () => void;
};

function ImportReviewForm({ imp, brands, talents, categories, onDone }: ReviewFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(approveImportAction, {});

  const draft = imp.parsedDraft ?? {};
  const conf = (draft.__confidence__ ?? {}) as Record<string, number>;
  // Returns Tailwind ring class based on confidence: green ≥ 0.8, yellow < 0.8
  const ring = (field: string): string => {
    const c = conf[field];
    if (c === undefined) return '';
    return c >= 0.8 ? 'ring-1 ring-emerald-500/50' : 'ring-1 ring-amber-500/50';
  };
  const [net, setNet] = useState<string>(draft.netAmount ?? '');
  const [vat, setVat] = useState<string>(draft.vatPct ?? '21.00');
  const [withholding, setWithholding] = useState<string>(draft.withholdingPct ?? '0.00');
  const [total, setTotal] = useState<string>(draft.totalAmount ?? '');

  const computedTotal = useMemo(() => {
    const n = Number(net);
    const v = Number(vat);
    const w = Number(withholding);
    if (Number.isNaN(n) || Number.isNaN(v) || Number.isNaN(w)) return '';
    return (n * (1 + (v - w) / 100)).toFixed(2);
  }, [net, vat, withholding]);

  // Auto-sync total from (net, vat) unless user has overridden it manually for this session.
  const [totalTouched, setTotalTouched] = useState(Boolean(draft.totalAmount));
  const displayedTotal = totalTouched ? total : computedTotal || total;

  // Cuando la server action termina con éxito, cerramos el form. Antes esto se hacía
  // con `setTimeout(onDone, 0)` dentro del render — anti-pattern (side effect en render).
  // El effect garantiza que `onDone` se invoca después del commit, sin loops si los
  // padres re-renderean.
  useEffect(() => {
    if (state.success && !isPending) {
      onDone();
    }
  }, [state.success, isPending, onDone]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={imp.id} />
      <input type="hidden" name="source" value={imp.sourceType} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={LABEL}>Tipo *</label>
          <select name="kind" defaultValue={draft.kind ?? 'income'} required className={`${INPUT} ${ring('kind')}`}>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Nº factura</label>
          <input name="number" defaultValue={draft.number ?? ''} className={`${INPUT} ${ring('number')}`} />
        </div>
        <div>
          <label className={LABEL}>Fecha emisión *</label>
          <input
            name="issueDate"
            type="date"
            required
            defaultValue={draft.issueDate ?? today}
            className={`${INPUT} ${ring('issueDate')}`}
          />
        </div>
        <div>
          <label className={LABEL}>Vencimiento</label>
          <input name="dueDate" type="date" defaultValue={draft.dueDate ?? ''} className={INPUT} />
        </div>

        <div className="md:col-span-2">
          <label className={LABEL}>Concepto *</label>
          <input
            name="concept"
            required
            defaultValue={draft.concept ?? ''}
            placeholder="Campaña abril, comisión casino X..."
            className={`${INPUT} ${ring('concept')}`}
          />
        </div>
        <div>
          <label className={LABEL}>Categoría</label>
          <input
            name="category"
            list="invoice-import-categories"
            defaultValue={draft.category ?? ''}
            placeholder="casino-deal, cs2-cajas..."
            className={INPUT}
          />
          <datalist id="invoice-import-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={LABEL}>Estado</label>
          <select name="status" defaultValue={draft.status ?? 'borrador'} className={INPUT}>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Marca CRM</label>
          <select name="brandId" defaultValue={draft.brandId ?? ''} className={INPUT}>
            <option value="">— ninguna —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Talent</label>
          <select name="talentId" defaultValue={draft.talentId ?? ''} className={INPUT}>
            <option value="">— ninguno —</option>
            {talents.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={LABEL}>O nombre libre (si no está en CRM)</label>
          <input
            name="counterpartyName"
            defaultValue={draft.counterpartyName ?? draft.issuerName ?? ''}
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>NIF emisor</label>
          <input name="issuerNif" defaultValue={draft.issuerNif ?? ''} className={`${INPUT} ${ring('issuerNif')}`} />
        </div>
        <div>
          <label className={LABEL}>Nombre emisor</label>
          <input name="issuerName" defaultValue={draft.issuerName ?? ''} className={`${INPUT} ${ring('issuerName')}`} />
        </div>

        <div>
          <label className={LABEL}>Neto *</label>
          <input
            name="netAmount"
            type="number"
            step="0.01"
            min="0"
            required
            value={net}
            onChange={(e) => setNet(e.target.value)}
            className={`${INPUT} ${ring('netAmount')}`}
          />
        </div>
        <div>
          <label className={LABEL}>IVA %</label>
          <input
            name="vatPct"
            type="number"
            step="0.01"
            min="0"
            value={vat}
            onChange={(e) => setVat(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Retención IRPF %</label>
          <input
            name="withholdingPct"
            type="number"
            step="0.01"
            min="0"
            value={withholding}
            onChange={(e) => setWithholding(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Serie</label>
          <input
            name="series"
            defaultValue={draft.series ?? 'A'}
            maxLength={20}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Total *</label>
          <input
            name="totalAmount"
            type="number"
            step="0.01"
            min="0"
            required
            value={displayedTotal}
            onChange={(e) => {
              setTotalTouched(true);
              setTotal(e.target.value);
            }}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Moneda</label>
          <select name="currency" defaultValue={draft.currency ?? 'EUR'} className={INPUT}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div className="md:col-span-4">
          <label className={LABEL}>Notas</label>
          <textarea name="notes" rows={2} defaultValue={draft.notes ?? ''} className={INPUT} />
        </div>
      </div>

      {state.error && <p className="text-xs text-red-400">{state.error}</p>}

      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onDone} className={BTN_GHOST}>
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? 'Aprobando…' : 'Aprobar y crear factura'}
        </button>
      </div>
    </form>
  );
}
