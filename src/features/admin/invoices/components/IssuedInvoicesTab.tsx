'use client';

import { useMemo, useState, useTransition } from 'react';
import { IssuedInvoiceForm }  from './IssuedInvoiceForm';
import { InvoicePdfButton }   from './InvoicePdfButton';
import { updateInvoiceStatusAction } from '@/app/admin/(dashboard)/facturacion/issued-invoices-actions';
import { ISSUED_INVOICE_STATUS_LABELS } from '@/lib/schemas/issuedInvoice';
import type { IssuerCompany, BillingClient, IssuedInvoiceWithRelations } from '@/types';

type BrandOpt    = { readonly id: number; readonly name: string };
type TalentOpt   = { readonly id: number; readonly name: string };
type CampaignOpt = {
  readonly id:          number;
  readonly name:        string;
  readonly brandId:     number | null;
  readonly talentId:    number | null;
  readonly amountBrand?:  string | number | null;
  readonly amountTalent?: string | number | null;
};

type Props = {
  readonly invoices:  readonly IssuedInvoiceWithRelations[];
  readonly issuers:   readonly IssuerCompany[];
  readonly clients:   readonly BillingClient[];
  readonly brands:    readonly BrandOpt[];
  readonly talents:   readonly TalentOpt[];
  readonly campaigns: readonly CampaignOpt[];
  readonly isAdmin?:  boolean;
  readonly isStaff?:  boolean;
};

const STATUS_STYLE: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-600 border-slate-200',
  emitida:  'bg-blue-50 text-blue-700 border-blue-200',
  enviada:  'bg-sky-50 text-sky-700 border-sky-200',
  cobrada:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  vencida:  'bg-red-50 text-red-700 border-red-200',
  anulada:  'bg-zinc-100 text-zinc-400 border-zinc-200',
};

const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

function fmt(n: string | number, currency = 'EUR'): string {
  const cur = ['EUR', 'USD', 'GBP'].includes(currency) ? currency : 'EUR';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(n));
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function IssuedInvoicesTab({
  invoices, issuers, clients, brands, talents, campaigns,
  isAdmin = false, isStaff = false,
}: Props): React.ReactElement {
  const [showForm,   setShowForm]   = useState(false);
  const [editInv,    setEditInv]    = useState<IssuedInvoiceWithRelations | null>(null);
  const [filterStatus, setStatus]   = useState('');
  const [filterIssuer, setIssuer]   = useState('');
  const [search,     setSearch]     = useState('');
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [isPending,  startTransition] = useTransition();

  const filtered = useMemo(() => {
    let result = invoices;
    if (!showAnuladas) result = result.filter((i) => i.status !== 'anulada');
    if (filterStatus) result = result.filter((i) => i.status === filterStatus);
    if (filterIssuer) result = result.filter((i) => String(i.issuerCompanyId) === filterIssuer);
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((i) =>
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.clientName.toLowerCase().includes(q) ||
      i.issuerName.toLowerCase().includes(q) ||
      (i.brandName ?? '').toLowerCase().includes(q),
    );
    return result;
  }, [invoices, filterStatus, filterIssuer, search, showAnuladas]);

  const totalVisible = filtered.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
  const cobradas     = invoices.filter((i) => i.status === 'cobrada').length;
  const pendientes   = invoices.filter((i) => i.status === 'emitida' || i.status === 'enviada').length;
  const vencidas     = invoices.filter((i) => i.status === 'vencida').length;

  function changeStatus(id: number, status: string): void {
    startTransition(async () => { await updateInvoiceStatusAction(id, status); });
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Emitidas / Enviadas', value: pendientes, accent: '#2563eb' },
          { label: 'Cobradas',            value: cobradas,   accent: '#16a34a' },
          { label: 'Vencidas',            value: vencidas,   accent: '#dc2626' },
          { label: 'Total visible',       value: fmt(totalVisible), accent: '#f5632a', isAmount: true },
        ].map((k) => (
          <div key={k.label} className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: k.accent }} />
            <div className="px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">{k.label}</p>
              <p className="text-[17px] font-bold tabular-nums mt-1" style={{ color: k.accent }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" placeholder="Buscar factura, cliente, empresa…" value={search}
          onChange={(e) => setSearch(e.target.value)} className={`${INPUT_SM} min-w-[200px] flex-1`} />
        <select value={filterStatus} onChange={(e) => setStatus(e.target.value)} className={INPUT_SM}>
          <option value="">Todos los estados</option>
          {Object.entries(ISSUED_INVOICE_STATUS_LABELS).filter(([k]) => k !== 'anulada' || showAnuladas).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {issuers.length > 1 && (
          <select value={filterIssuer} onChange={(e) => setIssuer(e.target.value)} className={INPUT_SM}>
            <option value="">Todas las empresas</option>
            {issuers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-[11px] text-sp-admin-muted cursor-pointer">
          <input type="checkbox" checked={showAnuladas} onChange={(e) => setShowAnuladas(e.target.checked)} className="rounded" />
          Mostrar anuladas
        </label>
        <div className="ml-auto flex items-center gap-2">
          {isStaff && (
            <span className="text-[10px] text-amber-600 font-medium">
              Vista filtrada — solo tus facturas
            </span>
          )}
          {!isStaff && (
            <button type="button" onClick={() => setShowForm(true)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 transition-colors">
              + Nueva factura
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-sm text-sp-admin-muted">
            {invoices.length === 0
              ? 'No hay facturas emitidas todavía. Crea la primera.'
              : 'Ninguna factura coincide con los filtros activos.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
                {['Nº Factura', 'Cliente', 'Emisora', 'Fecha', 'Vence', 'Total', 'Estado', 'Trato', 'PDF', 'Acciones'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const today = new Date().toISOString().slice(0, 10);
                const isOverdue = inv.status !== 'cobrada' && inv.status !== 'anulada' && !!inv.dueDate && inv.dueDate < today;
                return (
                  <tr key={inv.id} className={`border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/50 transition-colors group/row ${isOverdue ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setEditInv(inv)}
                        className="font-mono text-[12px] font-semibold text-sp-admin-accent hover:underline">
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-sp-admin-text max-w-[150px] truncate">{inv.clientName}</td>
                    <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted max-w-[120px] truncate">{inv.issuerName}</td>
                    <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted tabular-nums">{fmtDate(inv.issueDate)}</td>
                    <td className={`px-3 py-2.5 text-[11px] tabular-nums ${isOverdue ? 'text-red-600 font-semibold' : 'text-sp-admin-muted'}`}>
                      {fmtDate(inv.dueDate)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] font-bold tabular-nums text-emerald-700">{fmt(inv.totalAmount, inv.currency)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_STYLE[inv.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {ISSUED_INVOICE_STATUS_LABELS[inv.status as keyof typeof ISSUED_INVOICE_STATUS_LABELS] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted max-w-[120px] truncate">
                      {inv.dealName ?? inv.brandName ?? '—'}
                    </td>
                    {/* Columna PDF */}
                    <td className="px-3 py-2.5">
                      <InvoicePdfButton
                        invoice={inv}
                        issuer={issuers.find((i) => i.id === inv.issuerCompanyId)}
                        client={clients.find((c) => c.id === inv.billingClientId)}
                        compact
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        {/* Editar — no para facturas anuladas ni si es staff y la factura no es suya */}
                        {inv.status !== 'anulada' && (
                          <button type="button" onClick={() => setEditInv(inv)}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover transition-colors">
                            Editar
                          </button>
                        )}
                        {/* Flujo de estado */}
                        {inv.status === 'borrador' && (
                          <button type="button" disabled={isPending} onClick={() => changeStatus(inv.id, 'emitida')}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40 transition-colors">
                            Emitir
                          </button>
                        )}
                        {inv.status === 'emitida' && (
                          <button type="button" disabled={isPending} onClick={() => changeStatus(inv.id, 'enviada')}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-sky-600 hover:bg-sky-50 disabled:opacity-40 transition-colors">
                            Enviada
                          </button>
                        )}
                        {(inv.status === 'emitida' || inv.status === 'enviada' || inv.status === 'vencida') && (
                          <button type="button" disabled={isPending} onClick={() => changeStatus(inv.id, 'cobrada')}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition-colors">
                            Cobrada
                          </button>
                        )}
                        {/* Anular — solo admin, si no está ya anulada */}
                        {isAdmin && inv.status !== 'anulada' && (
                          <button type="button" disabled={isPending}
                            onClick={() => {
                              if (!confirm(`¿Anular la factura ${inv.invoiceNumber}? Esta acción no se puede deshacer.`)) return;
                              changeStatus(inv.id, 'anulada');
                            }}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors">
                            Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(showForm || editInv) && (
        <IssuedInvoiceForm
          invoice={editInv ?? undefined}
          issuers={issuers}
          clients={clients}
          brands={brands}
          talents={talents}
          campaigns={campaigns}
          onClose={() => { setShowForm(false); setEditInv(null); }}
        />
      )}
    </div>
  );
}
