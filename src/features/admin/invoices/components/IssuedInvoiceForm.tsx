'use client';

import { useActionState, useMemo, useState } from 'react';
import { InvoicePdfButton } from './InvoicePdfButton';
import {
  createIssuedInvoiceAction,
  updateIssuedInvoiceAction,
  createBillingClientAction,
} from '@/app/admin/(dashboard)/facturacion/issued-invoices-actions';
import { BILLING_CLIENT_TYPES, BILLING_CLIENT_TYPE_LABELS, ISSUED_INVOICE_STATUSES, ISSUED_INVOICE_STATUS_LABELS } from '@/lib/schemas/issuedInvoice';
import type { IssuerCompany, BillingClient, IssuedInvoiceWithRelations } from '@/types';

type BrandOpt    = { readonly id: number; readonly name: string };
type TalentOpt   = { readonly id: number; readonly name: string };
type CampaignOpt = {
  readonly id:           number;
  readonly name:         string;
  readonly brandId:      number | null;
  readonly talentId:     number | null;
  readonly amountBrand?:  string | number | null;
  readonly amountTalent?: string | number | null;
};

type Props = {
  readonly invoice?:   IssuedInvoiceWithRelations | undefined;
  readonly issuers:    readonly IssuerCompany[];
  readonly clients:    readonly BillingClient[];
  readonly brands:     readonly BrandOpt[];
  readonly talents:    readonly TalentOpt[];
  readonly campaigns:  readonly CampaignOpt[];
  readonly onClose:    () => void;
};

type Line = { concept: string; description: string; quantity: string; unitPrice: string; discount: string };

const I  = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const S  = 'text-[9px] font-black uppercase tracking-[0.2em] text-sp-admin-muted/70 mb-3 pb-1 border-b border-sp-admin-border/60';
const LB = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const BP = 'px-4 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors cursor-pointer';
const BG = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors cursor-pointer';

function r2(n: number): number { return Math.round(n * 100) / 100; }
function fmt(n: number): string { return n.toFixed(2); }

function emptyLine(): Line {
  return { concept: '', description: '', quantity: '1', unitPrice: '0', discount: '0' };
}

export function IssuedInvoiceForm({ invoice, issuers, clients, brands, talents, campaigns, onClose }: Props): React.ReactElement {
  const mode   = invoice ? 'edit' : 'create';
  const action = mode === 'create' ? createIssuedInvoiceAction : updateIssuedInvoiceAction;
  const [state, formAction, isPending] = useActionState(action, {});

  const today = new Date().toISOString().slice(0, 10);

  const [issuerId,     setIssuerId]     = useState(String(invoice?.issuerCompanyId ?? issuers[0]?.id ?? ''));
  const [clientId,     setClientId]     = useState(String(invoice?.billingClientId ?? ''));
  const [dealId,       setDealId]       = useState(String(invoice?.relatedDealId   ?? ''));
  const [brandId,      setBrandId]      = useState(String(invoice?.relatedBrandId  ?? ''));
  const [talentId,     setTalentId]     = useState(String(invoice?.relatedTalentId ?? ''));
  const [vatRate,      setVatRate]      = useState(String(invoice?.vatRate ?? '0'));
  const [withRate,     setWithRate]     = useState(String(invoice?.withholdingRate ?? '0'));
  const [lines,        setLines]        = useState<Line[]>(() =>
    invoice?.lines.length
      ? invoice.lines.map((l) => ({
          concept: l.concept, description: l.description ?? '',
          quantity: String(l.quantity), unitPrice: String(l.unitPrice), discount: String(l.discount),
        }))
      : [emptyLine()],
  );
  const [showNewClient, setShowNewClient] = useState(false);
  const [clientState, clientAction, clientPending] = useActionState(createBillingClientAction, {});

  if (clientState.success && !clientPending) {
    setShowNewClient(false);
    setClientId(String(clientState.id ?? ''));
  }

  // Live calculations
  const { net, vatAmt, withAmt, total } = useMemo(() => {
    const net = lines.reduce((s, l) => {
      const sub = r2(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discount) / 100));
      return s + sub;
    }, 0);
    const vatAmt  = r2(net * Number(vatRate)  / 100);
    const withAmt = r2(net * Number(withRate) / 100);
    return { net, vatAmt, withAmt, total: r2(net + vatAmt - withAmt) };
  }, [lines, vatRate, withRate]);

  const linesJson = JSON.stringify(lines.map((l) => ({
    concept:     l.concept,
    description: l.description || undefined,
    quantity:    l.quantity,
    unitPrice:   l.unitPrice,
    discount:    l.discount,
    subtotal:    fmt(r2(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discount) / 100))),
  })));

  function onDealChange(id: string): void {
    setDealId(id);
    if (!id) return;
    const camp = campaigns.find((c) => String(c.id) === id);
    if (!camp) return;

    // Autocompletar marca y talento
    if (camp.brandId)  setBrandId(String(camp.brandId));
    if (camp.talentId) setTalentId(String(camp.talentId));

    // Autocompletar cliente de facturación vinculado a la marca
    if (camp.brandId) {
      const linkedClient = clients.find((cl) => cl.relatedBrandId === camp.brandId);
      if (linkedClient && !clientId) setClientId(String(linkedClient.id));
    }

    // Autocompletar concepto e importe si el primer campo está vacío
    const amount = Number(camp.amountBrand ?? 0);
    setLines((prev) => {
      const firstEmpty = prev.length === 1 && prev[0]?.concept === '' && prev[0]?.unitPrice === '0';
      if (firstEmpty && amount > 0) {
        return [{
          concept:     `Campaña de marketing digital — ${camp.name}`,
          description: '',
          quantity:    '1',
          unitPrice:   amount.toFixed(2),
          discount:    '0',
        }];
      }
      return prev;
    });
  }

  function updateLine(idx: number, field: keyof Line, val: string): void {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  }

  const selectedIssuer = issuers.find((i) => String(i.id) === issuerId);

  if (state.success && !isPending) setTimeout(onClose, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-4xl my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border sticky top-0 bg-sp-admin-card z-10 rounded-t-xl">
          <h2 className="text-base font-bold text-sp-admin-text">
            {mode === 'create' ? '+ Nueva factura' : `Editar factura ${invoice?.invoiceNumber ?? ''}`}
          </h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none">×</button>
        </div>

        <form action={formAction} className="p-6 space-y-6">
          {invoice && <input type="hidden" name="id" value={invoice.id} />}
          <input type="hidden" name="linesJson" value={linesJson} />

          {/* A — Empresa emisora */}
          <div>
            <p className={S}>A · Empresa emisora</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LB}>Empresa *</label>
                <select name="issuerCompanyId" value={issuerId} onChange={(e) => setIssuerId(e.target.value)} required className={I}>
                  {issuers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {selectedIssuer && (
                <div className="flex items-end pb-0.5">
                  <p className="text-[11px] text-sp-admin-muted">
                    {[selectedIssuer.legalName, selectedIssuer.taxId, selectedIssuer.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* B — Cliente */}
          <div>
            <p className={S}>B · Cliente</p>
            {!showNewClient ? (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className={LB}>Cliente *</label>
                  <select name="billingClientId" value={clientId} onChange={(e) => setClientId(e.target.value)} required className={I}>
                    <option value="">— seleccionar cliente —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.taxId ? ` (${c.taxId})` : ''}{c.notes ? ` — ${c.notes}` : ''}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => setShowNewClient(true)}
                  className="h-10 px-3 rounded-lg text-[11px] font-semibold text-sp-admin-accent border border-sp-admin-accent/40 hover:bg-sp-admin-accent/10 transition-colors shrink-0">
                  + Nuevo cliente
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-sp-admin-border bg-sp-admin-hover/20 p-4 space-y-3">
                <p className="text-[11px] font-bold text-sp-admin-text">Nuevo cliente rápido</p>
                <form action={clientAction} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className={LB}>Nombre *</label><input name="name" required className={I} placeholder="Razón social o nombre" /></div>
                  <div><label className={LB}>CIF / NIF / VAT</label><input name="taxId" className={I} /></div>
                  <div><label className={LB}>País</label><input name="country" className={I} placeholder="España" /></div>
                  <div><label className={LB}>Email</label><input name="email" type="email" className={I} /></div>
                  <div>
                    <label className={LB}>Tipo</label>
                    <select name="type" className={I}>
                      {BILLING_CLIENT_TYPES.map((t) => <option key={t} value={t}>{BILLING_CLIENT_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button type="submit" disabled={clientPending} className={`${BP} h-10`}>
                      {clientPending ? 'Guardando…' : 'Crear'}
                    </button>
                    <button type="button" onClick={() => setShowNewClient(false)} className={`${BG} h-10`}>Cancelar</button>
                  </div>
                  {clientState.error && <p className="col-span-3 text-xs text-red-400">{clientState.error}</p>}
                </form>
              </div>
            )}
          </div>

          {/* C — Relación CRM */}
          <div>
            <p className={S}>C · Relación CRM (opcional)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={LB}>
                  Trato / Campaña
                  {dealId && <span className="ml-1 text-emerald-500 font-normal normal-case text-[9px]">● autocompleta datos</span>}
                </label>
                <select name="relatedDealId" value={dealId} onChange={(e) => onDealChange(e.target.value)} className={I}>
                  <option value="">— ninguno —</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{Number(c.amountBrand ?? 0) > 0 ? ` · ${Number(c.amountBrand).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}` : ''}
                    </option>
                  ))}
                </select>
                {dealId && (() => {
                  const camp = campaigns.find((c) => String(c.id) === dealId);
                  if (!camp?.brandId) return null;
                  const hasClient = clients.some((cl) => cl.relatedBrandId === camp.brandId);
                  if (hasClient) return null;
                  return (
                    <p className="text-[9px] text-amber-600 mt-1">
                      ⚠ Esta marca no tiene cliente de facturación vinculado.
                      Selecciona uno manualmente o créalo en la pestaña Clientes.
                    </p>
                  );
                })()}
              </div>
              <div>
                <label className={LB}>Marca</label>
                <select name="relatedBrandId" value={brandId} onChange={(e) => setBrandId(e.target.value)} className={I}>
                  <option value="">— ninguna —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LB}>Talento</label>
                <select name="relatedTalentId" value={talentId} onChange={(e) => setTalentId(e.target.value)} className={I}>
                  <option value="">— ninguno —</option>
                  {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* D — Datos factura */}
          <div>
            <p className={S}>D · Datos de factura</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className={LB}>Fecha emisión *</label><input name="issueDate" type="date" required defaultValue={invoice?.issueDate ?? today} className={I} /></div>
              <div><label className={LB}>Vencimiento</label><input name="dueDate" type="date" defaultValue={invoice?.dueDate ?? ''} className={I} /></div>
              <div>
                <label className={LB}>Moneda</label>
                <select name="currency" defaultValue={invoice?.currency ?? selectedIssuer?.defaultCurrency ?? 'EUR'} className={I}>
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
              </div>
              <div>
                <label className={LB}>Estado</label>
                <select name="status" defaultValue={invoice?.status ?? 'borrador'} className={I}>
                  {ISSUED_INVOICE_STATUSES.map((s) => <option key={s} value={s}>{ISSUED_INVOICE_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* E — Líneas */}
          <div>
            <p className={S}>E · Líneas de factura</p>
            <div className="rounded-xl border border-sp-admin-border overflow-hidden">
              <table className="w-full text-[12px]">
                <thead className="bg-sp-admin-hover/40">
                  <tr>
                    {['Concepto *', 'Cant.', 'P. unit.', 'Dto %', 'Subtotal', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sp-admin-border/40">
                  {lines.map((l, i) => {
                    const sub = r2(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discount) / 100));
                    return (
                      <tr key={i}>
                        <td className="px-2 py-1.5 min-w-[200px]">
                          <input value={l.concept} onChange={(e) => updateLine(i, 'concept', e.target.value)} placeholder="Descripción del servicio" className={`${I} text-[12px]`} required />
                        </td>
                        <td className="px-2 py-1.5 w-20">
                          <input value={l.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} type="number" step="0.01" min="0" className={`${I} text-[12px] tabular-nums`} />
                        </td>
                        <td className="px-2 py-1.5 w-28">
                          <input value={l.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} type="number" step="0.01" min="0" className={`${I} text-[12px] tabular-nums`} />
                        </td>
                        <td className="px-2 py-1.5 w-20">
                          <input value={l.discount} onChange={(e) => updateLine(i, 'discount', e.target.value)} type="number" step="0.01" min="0" max="100" className={`${I} text-[12px] tabular-nums`} />
                        </td>
                        <td className="px-3 py-1.5 w-28 text-right font-semibold tabular-nums text-sp-admin-text">
                          {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(sub)}
                        </td>
                        <td className="px-2 py-1.5 w-8">
                          {lines.length > 1 && (
                            <button type="button" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                              className="text-sp-admin-muted hover:text-red-400 transition-colors text-base leading-none">×</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t border-sp-admin-border/40 bg-sp-admin-hover/20">
                <button type="button" onClick={() => setLines((p) => [...p, emptyLine()])}
                  className="text-[11px] font-semibold text-sp-admin-accent hover:underline">+ Añadir línea</button>
              </div>
            </div>
          </div>

          {/* F — Impuestos + totales */}
          <div>
            <p className={S}>F · Impuestos y totales</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LB}>IVA %</label>
                <input name="vatRate" type="number" step="0.01" min="0" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={I} />
              </div>
              <div>
                <label className={LB}>Retención IRPF %</label>
                <input name="withholdingRate" type="number" step="0.01" min="0" value={withRate} onChange={(e) => setWithRate(e.target.value)} className={I} />
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-sp-admin-border bg-sp-admin-hover/20 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
              {[
                { label: 'Base imponible', value: net,    color: 'text-sp-admin-text' },
                { label: `IVA (${vatRate}%)`,  value: vatAmt,  color: 'text-emerald-700' },
                { label: `Ret. (${withRate}%)`, value: -withAmt, color: 'text-amber-700' },
                { label: 'Total factura',  value: total,  color: 'text-sp-admin-accent font-black text-[15px]' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{label}</p>
                  <p className={`tabular-nums font-bold mt-0.5 ${color}`}>
                    {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* G — Notas legales */}
          <div>
            <p className={S}>G · Nota legal y pago</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LB}>Nota legal (editable, validar con gestoría)</label>
                <textarea name="legalNote" rows={3} defaultValue={invoice?.legalNote ?? ''} placeholder="Invoice issued for international marketing services. VAT not applied according to applicable tax rules." className={I} />
              </div>
              <div>
                <label className={LB}>Condiciones de pago</label>
                <textarea name="paymentTerms" rows={3} defaultValue={invoice?.paymentTerms ?? selectedIssuer?.defaultPaymentTerms ?? ''} placeholder="Pago a 30 días desde la fecha de emisión" className={I} />
              </div>
            </div>
            <div className="mt-3">
              <label className={LB}>Notas internas</label>
              <textarea name="notes" rows={2} defaultValue={invoice?.notes ?? ''} className={I} />
            </div>
          </div>

          {state.error && <p className="text-xs text-red-400 font-medium">{state.error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-sp-admin-border/60">
            {/* PDF — solo en modo edición */}
            {mode === 'edit' && invoice && (
              <InvoicePdfButton
                invoice={invoice}
                issuer={issuers.find((i) => i.id === invoice.issuerCompanyId)}
                client={clients.find((c) => c.id === invoice.billingClientId)}
              />
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" onClick={onClose} className={BG}>Cancelar</button>
              <button type="submit" disabled={isPending} className={BP}>
                {isPending ? 'Guardando…' : mode === 'create' ? 'Crear factura' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
