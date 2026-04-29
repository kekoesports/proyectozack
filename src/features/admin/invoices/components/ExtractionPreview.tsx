import type { ExtractedInvoiceData } from '@/types';

export type ExtractionUIState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly filename: string }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'done'; readonly data: ExtractedInvoiceData; readonly applied: boolean };

type Props = {
  readonly state: Exclude<ExtractionUIState, { status: 'idle' }>;
  readonly onApply: (data: ExtractedInvoiceData) => void;
  readonly onDiscard: () => void;
};

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ConfidenceBadge({ value }: { readonly value: number }): React.ReactElement {
  const pct   = Math.round(value * 100);
  const label = pct >= 85 ? 'Alta' : pct >= 65 ? 'Media' : 'Baja';
  const cls   = pct >= 85
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pct >= 65
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
      {label} · {pct}%
    </span>
  );
}

function Row({ label, value }: { readonly label: string; readonly value?: string | null | undefined }): React.ReactElement | null {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-sp-admin-muted/70 w-24 shrink-0">{label}</span>
      <span className="text-[12px] text-sp-admin-text">{value}</span>
    </div>
  );
}

export function ExtractionPreview({ state, onApply, onDiscard }: Props): React.ReactElement {
  if (state.status === 'loading') {
    return (
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-hover/30 px-4 py-3 flex items-center gap-3">
        <svg className="animate-spin w-4 h-4 text-sp-admin-accent shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        <div>
          <p className="text-[12px] font-semibold text-sp-admin-text">Analizando factura…</p>
          <p className="text-[10px] text-sp-admin-muted truncate max-w-[280px]">{state.filename}</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
        <span className="text-red-400 text-base leading-none mt-0.5">⚠</span>
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-red-700">No se han podido extraer datos automáticamente</p>
          <p className="text-[11px] text-red-600 mt-0.5">{state.message} — Rellena los campos manualmente.</p>
        </div>
        <button type="button" onClick={onDiscard}
          className="text-[10px] font-semibold text-red-400 hover:text-red-600 transition-colors shrink-0 mt-0.5">
          ×
        </button>
      </div>
    );
  }

  const { data, applied } = state;

  if (applied) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 font-bold">✓</span>
          <p className="text-[12px] font-semibold text-emerald-800">Datos aplicados — Revisa los campos antes de guardar</p>
        </div>
        <button type="button" onClick={onDiscard}
          className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors shrink-0 underline">
          Descartar extracción
        </button>
      </div>
    );
  }

  const counterparty = data.type === 'expense' ? data.supplierName : data.customerName;

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sp-admin-border/60">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">Datos detectados</span>
        </div>
        <div className="flex items-center gap-2">
          {data.confidence !== undefined && <ConfidenceBadge value={data.confidence} />}
        </div>
      </div>

      {/* Data grid */}
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          <Row label="Tipo"       value={data.type === 'income' ? '↑ Ingreso' : data.type === 'expense' ? '↓ Gasto' : undefined} />
          <Row label="Nº factura" value={data.invoiceNumber} />
          <Row label="Fecha"      value={data.issueDate ? fmtDate(data.issueDate) : undefined} />
          <Row label="Vence"      value={data.dueDate ? fmtDate(data.dueDate) : undefined} />
          <Row label="Contraparte" value={counterparty} />
          <Row label="CIF/NIF"   value={data.taxId} />
          {data.iban && <Row label="IBAN" value={data.iban} />}
        </div>
        <div>
          <Row label="Neto"       value={data.netAmount !== undefined ? fmt(data.netAmount) : undefined} />
          <Row label="IVA"        value={data.vatRate !== undefined ? `${data.vatRate}%` : undefined} />
          <Row label="Retención"  value={data.withholdingRate !== undefined && data.withholdingRate > 0 ? `${data.withholdingRate}%` : undefined} />
          <Row label="Total"      value={data.totalAmount !== undefined ? fmt(data.totalAmount) : undefined} />
          <Row label="Moneda"     value={data.currency} />
          <Row label="Concepto"   value={data.concept} />
          {data.paymentMethod && <Row label="Método" value={data.paymentMethod} />}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-sp-admin-border/60 bg-amber-50/40 rounded-b-xl flex items-center justify-between gap-3">
        <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1.5">
          <span>⚠</span> Revisa los datos antes de guardar
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDiscard}
            className="px-3 py-1.5 text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover rounded-lg border border-sp-admin-border transition-colors">
            Descartar
          </button>
          <button type="button" onClick={() => onApply(data)}
            className="px-3 py-1.5 text-[11px] font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 rounded-lg transition-colors">
            Aplicar datos detectados
          </button>
        </div>
      </div>
    </div>
  );
}
