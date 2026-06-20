'use client';

import { useActionState, useMemo, useState } from 'react';
import { rectifyInvoiceAction } from '@/app/admin/(dashboard)/facturacion/issued-invoices-actions';
import type { IssuedInvoiceWithRelations } from '@/types';

type Props = {
  readonly invoice: IssuedInvoiceWithRelations;
  readonly onClose: () => void;
};

type Line = { concept: string; description: string; quantity: string; unitPrice: string; discount: string };

const I  = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LB = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';

function r2(n: number): number { return Math.round(n * 100) / 100; }

function fmt(n: string | number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n));
}

export function RectifyInvoiceModal({ invoice, onClose }: Props): React.ReactElement {
  const [state, formAction, isPending] = useActionState(rectifyInvoiceAction, {});

  const today = new Date().toISOString().slice(0, 10);

  const [lines, setLines] = useState<Line[]>(() =>
    invoice.lines.length
      ? invoice.lines.map((l) => ({
          concept: l.concept, description: l.description ?? '',
          quantity: String(l.quantity), unitPrice: String(l.unitPrice), discount: String(l.discount),
        }))
      : [{ concept: '', description: '', quantity: '1', unitPrice: '0', discount: '0' }],
  );

  const { net, vatAmt, withAmt, total } = useMemo(() => {
    const vatRate  = Number(invoice.vatRate  ?? '0');
    const withRate = Number(invoice.withholdingRate ?? '0');
    const net = lines.reduce((s, l) => {
      return s + r2(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discount) / 100));
    }, 0);
    const vatAmt  = r2(net * vatRate / 100);
    const withAmt = r2(net * withRate / 100);
    return { net, vatAmt, withAmt, total: r2(net + vatAmt - withAmt) };
  }, [lines, invoice.vatRate, invoice.withholdingRate]);

  const linesJson = JSON.stringify(lines.map((l) => ({
    concept: l.concept,
    description: l.description || undefined,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discount: l.discount,
    subtotal: String(r2(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discount) / 100))),
  })));

  function updateLine(i: number, field: keyof Line, value: string): void {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }
  function addLine(): void { setLines((prev) => [...prev, { concept: '', description: '', quantity: '1', unitPrice: '0', discount: '0' }]); }
  function removeLine(i: number): void { setLines((prev) => prev.filter((_, idx) => idx !== i)); }

  if (state.success) {
    onClose();
    return <></>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sp-admin-border flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-[15px] font-bold text-sp-admin-text">Factura Rectificativa</h2>
            <p className="text-[11px] text-sp-admin-muted mt-0.5">Rectifica: <span className="font-mono font-semibold text-violet-700">{invoice.invoiceNumber}</span></p>
          </div>
          <button type="button" onClick={onClose}
            className="text-sp-admin-muted hover:text-sp-admin-text text-xl font-light transition-colors">✕</button>
        </div>

        <form action={formAction} className="p-6 space-y-5">
          <input type="hidden" name="originalInvoiceId" value={invoice.id} />
          <input type="hidden" name="linesJson" value={linesJson} />

          {/* Info original */}
          <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 text-[12px] text-violet-800">
            <p className="font-semibold mb-1">Factura original: {invoice.invoiceNumber}</p>
            <p className="text-violet-600">Cliente: {invoice.clientName} · Total: {fmt(invoice.totalAmount, invoice.currency ?? 'EUR')}</p>
          </div>

          {/* Tipo y fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LB}>Tipo de rectificativa</label>
              <select name="rectificationType" defaultValue="sustitutiva" className={I}>
                <option value="sustitutiva">Sustitutiva — reemplaza totalmente</option>
                <option value="por_diferencia">Por diferencia — solo el ajuste</option>
              </select>
            </div>
            <div>
              <label className={LB}>Fecha de emisión</label>
              <input type="date" name="issueDate" defaultValue={today} className={I} />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className={LB}>Motivo de rectificación <span className="text-red-500">*</span></label>
            <textarea name="rectificationReason" rows={2} required
              placeholder="Describe el motivo de esta rectificativa (error en importe, datos del cliente, concepto…)"
              className={`${I} resize-none`} />
          </div>

          {/* Líneas */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sp-admin-muted/70 mb-3 pb-1 border-b border-sp-admin-border/60">
              Líneas de factura
            </p>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_80px_60px_28px] gap-2 items-start">
                  <div>
                    <input placeholder="Concepto" value={l.concept} required
                      onChange={(e) => updateLine(i, 'concept', e.target.value)} className={I} />
                    <input placeholder="Descripción (opcional)" value={l.description}
                      onChange={(e) => updateLine(i, 'description', e.target.value)}
                      className={`${I} mt-1 text-[11px] text-sp-admin-muted`} />
                  </div>
                  <input placeholder="Cant." type="number" min="0.01" step="0.01" value={l.quantity}
                    onChange={(e) => updateLine(i, 'quantity', e.target.value)} className={I} />
                  <input placeholder="Precio" type="number" step="0.01" value={l.unitPrice}
                    onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} className={I} />
                  <input placeholder="Dto%" type="number" min="0" max="100" step="1" value={l.discount}
                    onChange={(e) => updateLine(i, 'discount', e.target.value)} className={I} />
                  <button type="button" onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    className="h-8 w-7 rounded text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20 transition-colors text-lg leading-none">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine}
              className="mt-2 text-[11px] font-semibold text-sp-admin-accent hover:underline">
              + Añadir línea
            </button>
          </div>

          {/* Totales */}
          <div className="rounded-xl bg-sp-admin-hover/40 border border-sp-admin-border px-4 py-3 space-y-1 text-[12px]">
            <div className="flex justify-between text-sp-admin-muted">
              <span>Base imponible</span><span>{fmt(net)}</span>
            </div>
            <div className="flex justify-between text-sp-admin-muted">
              <span>IVA ({Number(invoice.vatRate ?? 0).toFixed(0)}%)</span><span>{fmt(vatAmt)}</span>
            </div>
            {withAmt > 0 && (
              <div className="flex justify-between text-sp-admin-muted">
                <span>Retención ({Number(invoice.withholdingRate ?? 0).toFixed(0)}%)</span><span>-{fmt(withAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sp-admin-text border-t border-sp-admin-border pt-1 mt-1">
              <span>Total</span><span className="text-emerald-700">{fmt(total)}</span>
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-sp-admin-border">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {isPending ? 'Emitiendo…' : 'Emitir Rectificativa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
