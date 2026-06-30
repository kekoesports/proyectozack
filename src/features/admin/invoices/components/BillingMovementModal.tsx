'use client';

import { useActionState, useMemo, useState } from 'react';
import {
  createInvoiceAction,
  updateInvoiceAction,
} from '@/app/admin/(dashboard)/facturacion/invoices-actions';
import { extractInvoiceAction } from '@/app/admin/(dashboard)/facturacion/extract-action';
import {
  INCOME_STATUSES,
  EXPENSE_STATUSES,
  INVOICE_COMPANIES,
  INVOICE_COMPANY_LABELS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_PAYMENT_METHOD_LABELS,
  BILLING_CATEGORIES,
  AI_TOOLS,
} from '@/lib/schemas/invoice';
import { ExtractionPreview } from './ExtractionPreview';
import type { ExtractionUIState } from './ExtractionPreview';
import type { ExtractedInvoiceData, InvoiceWithRelations, InvoiceKind } from '@/types';

type BrandOption    = { readonly id: number; readonly name: string };
type TalentOption   = { readonly id: number; readonly name: string };
type CampaignOption = { readonly id: number; readonly name: string; readonly brandId: number | null; readonly talentId: number | null };

type Props = {
  readonly invoice?: InvoiceWithRelations;
  readonly brands:    readonly BrandOption[];
  readonly talents:   readonly TalentOption[];
  readonly campaigns: readonly CampaignOption[];
  readonly onClose:   () => void;
};

const INPUT  = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LABEL  = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const BTN_P  = 'px-4 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors cursor-pointer';
const BTN_G  = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer border border-sp-admin-border';
const SECTION = 'text-[9px] font-black uppercase tracking-[0.2em] text-sp-admin-muted/70 mb-3 pb-1 border-b border-sp-admin-border/60';

const INCOME_LABELS: Record<typeof INCOME_STATUSES[number], string>  = { cobrada: 'Cobrado', no_cobrado: 'No cobrado', pendiente: 'Pendiente', anulada: 'Anulado' };
const EXPENSE_LABELS: Record<typeof EXPENSE_STATUSES[number], string> = { cobrada: 'Pagado',  no_pagado:  'No pagado',  pendiente: 'Pendiente', anulada: 'Anulado' };

export function BillingMovementModal({ invoice, brands, talents, campaigns, onClose }: Props): React.ReactElement {
  const mode   = invoice ? 'edit' : 'create';
  const action = mode === 'create' ? createInvoiceAction : updateInvoiceAction;
  const [state, formAction, isPending] = useActionState(action, {});

  const today = new Date().toISOString().slice(0, 10);

  // ── Campos controlados ────────────────────────────────────────────
  const [kind,              setKind]              = useState<InvoiceKind>(invoice?.kind ?? 'income');
  const [concept,           setConcept]           = useState(invoice?.concept ?? '');
  const [description,       setDescription]       = useState(invoice?.description ?? '');
  const [invoiceNumber,     setInvoiceNumber]     = useState(invoice?.number ?? '');
  const [issueDate,         setIssueDate]         = useState(invoice?.issueDate ?? today);
  const [dueDate,           setDueDate]           = useState(invoice?.dueDate ?? '');
  const [net,               setNet]               = useState(String(invoice?.netAmount ?? '0.00'));
  const [vat,               setVat]               = useState(String(invoice?.vatPct ?? '0.00'));
  const [withholding,       setWithholding]       = useState(String(invoice?.withholdingPct ?? '0.00'));
  const [currency,          setCurrency]          = useState(invoice?.currency ?? 'EUR');
  const [counterpartyName,  setCounterpartyName]  = useState(invoice?.counterpartyName ?? '');
  const [selectedCampaign,  setSelectedCampaign]  = useState(String(invoice?.campaignId ?? ''));
  const [brandId,           setBrandId]           = useState(String(invoice?.brandId ?? ''));
  const [talentId,          setTalentId]          = useState(String(invoice?.talentId ?? ''));
  const [category,          setCategory]          = useState(invoice?.category ?? '');

  // ── Tracking de campos editados manualmente ───────────────────────
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  function touch(field: string): void {
    setTouched((prev) => { const s = new Set(prev); s.add(field); return s; });
  }

  // ── Estado de extracción ──────────────────────────────────────────
  const [extraction, setExtraction] = useState<ExtractionUIState>({ status: 'idle' });

  function onInvoiceFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;

    setExtraction({ status: 'loading', filename: file.name });
    const fd = new FormData();
    fd.append('file', file);
    void extractInvoiceAction(fd).then((result) => {
      if (result.error) {
        setExtraction({ status: 'error', message: result.error });
      } else if (result.data) {
        setExtraction({ status: 'done', data: result.data, applied: false });
      }
    }).catch(() => {
      setExtraction({ status: 'error', message: 'Error inesperado al analizar el archivo.' });
    });
  }

  function applyExtraction(data: ExtractedInvoiceData): void {
    if (data.type && !touched.has('kind'))                              setKind(data.type);
    if (data.concept           && !touched.has('concept')    && !concept)          setConcept(data.concept);
    if (data.description       && !touched.has('description') && !description)     setDescription(data.description);
    if (data.invoiceNumber     && !touched.has('number')     && !invoiceNumber)    setInvoiceNumber(data.invoiceNumber);
    if (data.issueDate         && !touched.has('issueDate'))                        setIssueDate(data.issueDate);
    if (data.dueDate           && !touched.has('dueDate')    && !dueDate)          setDueDate(data.dueDate);
    if (data.netAmount   !== undefined && !touched.has('net')  && Number(net) === 0)    setNet(String(data.netAmount));
    if (data.vatRate     !== undefined && !touched.has('vat')  && Number(vat) === 0)    setVat(String(data.vatRate));
    if (data.withholdingRate !== undefined && !touched.has('withholding') && Number(withholding) === 0) setWithholding(String(data.withholdingRate));
    if (data.currency && !touched.has('currency') && currency === 'EUR')           setCurrency(data.currency);
    const party = data.type === 'expense' ? data.supplierName : data.customerName;
    if (party && !touched.has('counterpartyName') && !counterpartyName)            setCounterpartyName(party);
    setExtraction((prev) => prev.status === 'done' ? { ...prev, applied: true } : prev);
  }

  // ── Total calculado ───────────────────────────────────────────────
  const total = useMemo(() => {
    const n = Number(net);
    const v = Number(vat);
    const w = Number(withholding);
    if (Number.isNaN(n) || Number.isNaN(v) || Number.isNaN(w)) return '0.00';
    return (n * (1 + (v - w) / 100)).toFixed(2);
  }, [net, vat, withholding]);

  const statusOptions = kind === 'income' ? INCOME_STATUSES : EXPENSE_STATUSES;
  const statusLabels  = kind === 'income' ? INCOME_LABELS   : EXPENSE_LABELS;
  const defaultStatus = invoice?.status ?? 'pendiente';

  function onCampaignChange(id: string): void {
    setSelectedCampaign(id);
    if (!id) return;
    const camp = campaigns.find((c) => String(c.id) === id);
    if (!camp) return;
    if (camp.brandId && !touched.has('brandId'))   setBrandId(String(camp.brandId));
    if (camp.talentId && !touched.has('talentId')) setTalentId(String(camp.talentId));
  }

  if (state.success && !isPending) setTimeout(onClose, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border sticky top-0 bg-sp-admin-card z-10">
          <h2 className="text-base font-bold text-sp-admin-text">
            {mode === 'create' ? '+ Nuevo movimiento' : 'Editar movimiento'}
          </h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none transition-colors">×</button>
        </div>

        <form action={formAction} className="p-6 space-y-6">
          {invoice && <input type="hidden" name="id" value={invoice.id} />}

          {/* ── 1 · Datos principales ── */}
          <div>
            <p className={SECTION}>1 · Datos principales</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LABEL}>Tipo *</label>
                <select name="kind" value={kind} onChange={(e) => { setKind(e.target.value as InvoiceKind); touch('kind'); }} required className={INPUT}>
                  <option value="income">↑ Ingreso</option>
                  <option value="expense">↓ Gasto</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className={LABEL}>Concepto *</label>
                <input name="concept" required value={concept} onChange={(e) => { setConcept(e.target.value); touch('concept'); }} placeholder="Campaña abril, pago tool, nómina…" className={INPUT} />
              </div>
              <div className="md:col-span-4">
                <label className={LABEL}>Descripción</label>
                <textarea name="description" rows={2} value={description} onChange={(e) => { setDescription(e.target.value); touch('description'); }} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Neto *</label>
                <input name="netAmount" type="number" step="0.01" min="0" required value={net} onChange={(e) => { setNet(e.target.value); touch('net'); }} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>IVA %</label>
                <input name="vatPct" type="number" step="0.01" min="0" value={vat} onChange={(e) => { setVat(e.target.value); touch('vat'); }} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Retención %</label>
                <input name="withholdingPct" type="number" step="0.01" min="0" value={withholding} onChange={(e) => { setWithholding(e.target.value); touch('withholding'); }} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Total</label>
                <input name="totalAmount" type="number" step="0.01" value={total} readOnly className={`${INPUT} bg-sp-admin-hover/40`} />
              </div>
              <div>
                <label className={LABEL}>Moneda</label>
                <select name="currency" value={currency} onChange={(e) => { setCurrency(e.target.value); touch('currency'); }} className={INPUT}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Fecha *</label>
                <input name="issueDate" type="date" required value={issueDate} onChange={(e) => { setIssueDate(e.target.value); touch('issueDate'); }} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Vencimiento</label>
                <input name="dueDate" type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); touch('dueDate'); }} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Nº factura</label>
                <input name="number" value={invoiceNumber} onChange={(e) => { setInvoiceNumber(e.target.value); touch('number'); }} className={INPUT} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Referencia / TXID <span className="text-sp-admin-muted font-normal normal-case">(hash crypto, nº operación banco…)</span></label>
                <input name="txId" type="text" defaultValue={invoice?.txId ?? ''} maxLength={200} placeholder="0x1a2b3c… o ES0021001234567890" className={INPUT} />
              </div>
            </div>
          </div>

          {/* ── 2 · Relación CRM ── */}
          <div>
            <p className={SECTION}>2 · Relación CRM</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={LABEL}>Campaña / Trato</label>
                <select name="campaignId" value={selectedCampaign} onChange={(e) => onCampaignChange(e.target.value)} className={INPUT}>
                  <option value="">— ninguna —</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Marca</label>
                <select name="brandId" value={brandId} onChange={(e) => { setBrandId(e.target.value); touch('brandId'); }} className={INPUT}>
                  <option value="">— ninguna —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Influencer</label>
                <select name="talentId" value={talentId} onChange={(e) => { setTalentId(e.target.value); touch('talentId'); }} className={INPUT}>
                  <option value="">— ninguno —</option>
                  {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className={LABEL}>O nombre libre (si no está en CRM)</label>
                <input name="counterpartyName" value={counterpartyName} onChange={(e) => { setCounterpartyName(e.target.value); touch('counterpartyName'); }} className={INPUT} />
              </div>
            </div>
          </div>

          {/* ── 3 · Clasificación ── */}
          <div>
            <p className={SECTION}>3 · Clasificación</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LABEL}>Entidad</label>
                <select name="company" defaultValue={invoice?.company ?? ''} className={INPUT}>
                  <option value="">— ninguna —</option>
                  {INVOICE_COMPANIES.map((c) => <option key={c} value={c}>{INVOICE_COMPANY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Categoría</label>
                <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
                  <option value="">— ninguna —</option>
                  {BILLING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Método / Cuenta</label>
                <select name="paymentMethod" defaultValue={invoice?.paymentMethod ?? ''} className={INPUT}>
                  <option value="">— ninguno —</option>
                  {INVOICE_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{INVOICE_PAYMENT_METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Estado</label>
                <select name="status" defaultValue={(statusOptions as readonly string[]).includes(defaultStatus) ? defaultStatus : 'pendiente'} className={INPUT}>
                  {statusOptions.map((s) => <option key={s} value={s}>{statusLabels[s as keyof typeof statusLabels]}</option>)}
                </select>
              </div>
              {category === 'Herramientas IA' && (
                <div>
                  <label className={LABEL}>Qué IA</label>
                  <select name="aiToolName" defaultValue={invoice?.aiToolName ?? ''} className={INPUT}>
                    <option value="">— selecciona —</option>
                    {AI_TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={LABEL}>Serie</label>
                <input name="series" defaultValue={invoice?.series ?? 'A'} maxLength={20} className={INPUT} />
              </div>
            </div>
          </div>

          {/* ── 4 · Archivos ── */}
          <div>
            <p className={SECTION}>4 · Archivos</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Factura — extrae datos automáticamente (PDF, JPG, PNG — máx 10 MB)</label>
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.xlsx,.csv"
                  onChange={onInvoiceFileChange}
                  className={`${INPUT} file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-hover file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sp-admin-text`}
                />
                {invoice?.id && invoice?.fileUrl
                  ? <p className="text-xs text-sp-admin-muted mt-1">Actual: <a href={`/api/admin/facturacion/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className="text-sp-admin-accent hover:underline">ver</a></p>
                  : <p className="text-[10px] text-sp-admin-muted/60 mt-1">Sin factura subida</p>
                }
              </div>
              <div>
                <label className={LABEL}>Comprobante (PDF, JPG, PNG, XLSX, CSV — máx 10 MB)</label>
                <input name="receiptFile" type="file" accept="application/pdf,image/*,.xlsx,.csv" className={`${INPUT} file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-hover file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sp-admin-text`} />
                {invoice?.receiptFileUrl
                  ? <p className="text-xs text-sp-admin-muted mt-1">Actual: <a href={invoice.receiptFileUrl} target="_blank" rel="noreferrer" className="text-sp-admin-accent hover:underline">ver</a></p>
                  : <p className="text-[10px] text-sp-admin-muted/60 mt-1">Sin comprobante subido</p>
                }
              </div>
            </div>

            {/* Panel de extracción */}
            {extraction.status !== 'idle' && (
              <div className="mt-3">
                <ExtractionPreview
                  state={extraction}
                  onApply={applyExtraction}
                  onDiscard={() => setExtraction({ status: 'idle' })}
                />
              </div>
            )}
          </div>

          {/* ── 5 · Notas ── */}
          <div>
            <p className={SECTION}>5 · Notas internas</p>
            <textarea name="notes" rows={3} defaultValue={invoice?.notes ?? ''} placeholder="Notas internas, referencias, contexto…" className={INPUT} />
          </div>

          {state.error && <p className="text-xs text-red-400 font-medium">{state.error}</p>}

          <div className="flex items-center gap-2 justify-end pt-2 border-t border-sp-admin-border/60">
            <button type="button" onClick={onClose} className={BTN_G}>Cancelar</button>
            <button type="submit" disabled={isPending} className={BTN_P}>
              {isPending ? 'Guardando…' : mode === 'create' ? 'Crear movimiento' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
