'use client';

import { useActionState, useMemo, useState } from 'react';
import {
  createBillingClientAction,
  updateBillingClientAction,
} from '@/app/admin/(dashboard)/facturacion/issued-invoices-actions';
import {
  BILLING_CLIENT_TYPES,
  BILLING_CLIENT_TYPE_LABELS,
} from '@/lib/schemas/issuedInvoice';
import type { BillingClient, IssuedInvoiceWithRelations } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const INPUT  = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL  = 'block text-[10px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

// ── Props ─────────────────────────────────────────────────────────────

type BrandOption = { readonly id: number; readonly name: string };

type Props = {
  readonly clients:  readonly BillingClient[];
  readonly invoices: readonly IssuedInvoiceWithRelations[];
  readonly brands:   readonly BrandOption[];
};

// ── Client Form ───────────────────────────────────────────────────────

type FormMode = 'create' | 'edit';
type FormState = { readonly error?: string; readonly success?: boolean; readonly id?: number };

function ClientForm({
  mode, client, brands, onDone,
}: {
  readonly mode:    FormMode;
  readonly client?: BillingClient | undefined;
  readonly brands:  readonly BrandOption[];
  readonly onDone:  () => void;
}): React.ReactElement {
  const action = mode === 'create' ? createBillingClientAction : updateBillingClientAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, {});

  if (state.success) { onDone(); return <></>; }

  return (
    <form action={formAction} className="space-y-4">
      {client && <input type="hidden" name="id" value={client.id} />}

      {/* Nombre + Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Nombre *</label>
          <input name="name" required defaultValue={client?.name ?? ''} className={INPUT} maxLength={200}
            placeholder="Winamax Spain SL" />
        </div>
        <div>
          <label className={LABEL}>Tipo de cliente</label>
          <select name="type" defaultValue={client?.type ?? 'empresa_espana'} className={INPUT}>
            {BILLING_CLIENT_TYPES.map((t) => (
              <option key={t} value={t}>{BILLING_CLIENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Razón social</label>
          <input name="legalName" defaultValue={client?.legalName ?? ''} className={INPUT} maxLength={250} />
        </div>
        <div>
          <label className={LABEL}>NIF / Tax ID</label>
          <input name="taxId" defaultValue={client?.taxId ?? ''} className={INPUT} maxLength={30} />
        </div>
        <div>
          <label className={LABEL}>VAT / EIN (opcional)</label>
          <input name="vatNumber" defaultValue={client?.vatNumber ?? ''} className={INPUT} maxLength={30}
            placeholder="EU123456789" />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input name="email" type="email" defaultValue={client?.email ?? ''} className={INPUT} maxLength={180} />
        </div>
        <div>
          <label className={LABEL}>País</label>
          <input name="country" defaultValue={client?.country ?? ''} className={INPUT} maxLength={50} />
        </div>
        <div>
          <label className={LABEL}>Ciudad</label>
          <input name="city" defaultValue={client?.city ?? ''} className={INPUT} maxLength={100} />
        </div>
        <div>
          <label className={LABEL}>Código postal</label>
          <input name="postalCode" defaultValue={client?.postalCode ?? ''} className={INPUT} maxLength={20} />
        </div>
        <div>
          <label className={LABEL}>Marca vinculada (CRM)</label>
          <select name="relatedBrandId" defaultValue={client?.relatedBrandId ? String(client.relatedBrandId) : ''} className={INPUT}>
            <option value="">— sin vincular —</option>
            {brands.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className={LABEL}>Dirección fiscal</label>
        <textarea name="address" rows={2} defaultValue={client?.address ?? ''} className={`${INPUT} resize-none`}
          placeholder="Calle…" />
      </div>

      {/* Impuestos por defecto */}
      <div className="rounded-lg border border-sp-admin-border/60 bg-sp-admin-card p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Impuestos por defecto</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>IVA % por defecto</label>
            <input name="defaultVatRate" type="number" step="0.01" min="0" max="100"
              defaultValue={client?.defaultVatRate ?? '0'} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Retención % por defecto</label>
            <input name="defaultWithholdingRate" type="number" step="0.01" min="0" max="100"
              defaultValue={client?.defaultWithholdingRate ?? '0'} className={INPUT} />
          </div>
        </div>
      </div>

      {/* Idioma del PDF */}
      <div>
        <label className={LABEL}>Idioma del PDF de factura</label>
        <select name="pdfLanguage" defaultValue={client?.pdfLanguage ?? 'en'} className={INPUT}>
          <option value="en">English (default)</option>
          <option value="es">Español</option>
        </select>
        <p className="text-[10px] text-sp-admin-muted mt-1">
          Se aplica al descargar el PDF. Puedes forzar el otro idioma puntualmente desde el botón de descarga.
        </p>
      </div>

      {/* Notas */}
      <div>
        <label className={LABEL}>Notas internas</label>
        <textarea name="notes" rows={2} defaultValue={client?.notes ?? ''} className={`${INPUT} resize-none`} />
      </div>

      {state.error && (
        <p className="text-[12px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onDone}
          className="h-8 px-4 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isPending}
          className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors">
          {isPending ? 'Guardando…' : mode === 'create' ? 'Crear cliente' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

// ── ClientRow ─────────────────────────────────────────────────────────

function ClientRow({
  client, invoicesForClient, brands,
}: {
  readonly client:            BillingClient;
  readonly invoicesForClient: readonly IssuedInvoiceWithRelations[];
  readonly brands:            readonly BrandOption[];
}): React.ReactElement {
  const [editing,  setEditing]  = useState(false);
  const [expanded, setExpanded] = useState(false);

  const totalFacturado = invoicesForClient
    .filter((i) => i.status !== 'anulada')
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  const pendienteCobro = invoicesForClient
    .filter((i) => ['emitida', 'enviada', 'vencida'].includes(i.status))
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="border-b border-sp-admin-border/50 last:border-0">
      {!editing ? (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-sp-admin-hover/30 transition-colors">
          {/* Avatar iniciales */}
          <div className="w-8 h-8 rounded-full bg-sp-admin-accent/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-sp-admin-accent">
              {client.name.slice(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-sp-admin-text">{client.name}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sp-admin-hover border border-sp-admin-border text-sp-admin-muted uppercase">
                {BILLING_CLIENT_TYPE_LABELS[client.type as typeof BILLING_CLIENT_TYPES[number]] ?? client.type}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-sp-admin-muted flex-wrap">
              {client.taxId && <span>NIF: {client.taxId}</span>}
              {client.country && <span>{client.country}</span>}
              {client.email  && <span>{client.email}</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 shrink-0 text-right">
            <div>
              <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Facturado</p>
              <p className="text-[12px] font-bold text-sp-admin-text tabular-nums">{EUR.format(totalFacturado)}</p>
            </div>
            {pendienteCobro > 0 && (
              <div>
                <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Pendiente</p>
                <p className="text-[12px] font-bold text-amber-600 tabular-nums">{EUR.format(pendienteCobro)}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Facturas</p>
              <p className="text-[12px] font-bold text-sp-admin-text">{invoicesForClient.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {invoicesForClient.length > 0 && (
              <button type="button" onClick={() => setExpanded((v) => !v)}
                className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover transition-colors">
                {expanded ? 'Ocultar' : `Ver ${invoicesForClient.length} factura${invoicesForClient.length !== 1 ? 's' : ''}`}
              </button>
            )}
            <button type="button" onClick={() => setEditing(true)}
              className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
              Editar
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 bg-sp-admin-hover/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-sp-admin-text">Editar cliente</p>
          </div>
          <ClientForm mode="edit" client={client} brands={brands} onDone={() => setEditing(false)} />
        </div>
      )}

      {/* Vista expandida — facturas del cliente */}
      {expanded && !editing && invoicesForClient.length > 0 && (
        <div className="border-t border-sp-admin-border/50 bg-sp-admin-hover/10">
          <div className="px-4 py-2.5 border-b border-sp-admin-border/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">
              Facturas de {client.name}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-sp-admin-border/30">
                  {['Nº Factura', 'Fecha', 'Vence', 'Total', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-sp-admin-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoicesForClient.map((inv) => {
                  const today    = new Date().toISOString().slice(0, 10);
                  const isOverdue = inv.status !== 'cobrada' && inv.status !== 'anulada' && !!inv.dueDate && inv.dueDate < today;
                  return (
                    <tr key={inv.id} className="border-b border-sp-admin-border/20 last:border-0 hover:bg-sp-admin-hover/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-[11px] font-semibold text-sp-admin-accent">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2 text-[11px] text-sp-admin-muted tabular-nums">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className={`px-4 py-2 text-[11px] tabular-nums ${isOverdue ? 'text-red-600 font-semibold' : 'text-sp-admin-muted'}`}>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-2 text-[12px] font-bold tabular-nums text-emerald-700">
                        {EUR.format(Number(inv.totalAmount))}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          inv.status === 'cobrada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          inv.status === 'anulada' ? 'bg-zinc-100 text-zinc-400 border-zinc-200' :
                          isOverdue ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {inv.status === 'cobrada' ? 'Cobrada' :
                           inv.status === 'anulada' ? 'Anulada' :
                           isOverdue ? 'Vencida' :
                           inv.status === 'borrador' ? 'Borrador' : 'Emitida'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function BillingClientsManager({ clients, invoices, brands }: Props): React.ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.legalName ?? '').toLowerCase().includes(q) ||
      (c.taxId     ?? '').toLowerCase().includes(q) ||
      (c.country   ?? '').toLowerCase().includes(q),
    );
  }, [clients, search]);

  // Agrupar facturas por cliente
  const invByClient = useMemo(() => {
    const map = new Map<number, IssuedInvoiceWithRelations[]>();
    for (const inv of invoices) {
      const list = map.get(inv.billingClientId) ?? [];
      list.push(inv);
      map.set(inv.billingClientId, list);
    }
    return map;
  }, [invoices]);

  return (
    <div className="space-y-4">

      {/* Barra de herramientas */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <input
          type="search"
          placeholder="Buscar cliente, NIF, país…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT_SM} flex-1 min-w-[200px]`}
        />
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-sp-admin-muted tabular-nums">{filtered.length} clientes</span>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors flex items-center gap-1.5"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Formulario crear cliente */}
      {showForm && (
        <div className="rounded-xl border border-sp-admin-accent/30 bg-sp-admin-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-sp-admin-text">Nuevo cliente de facturación</p>
          </div>
          <ClientForm mode="create" brands={brands} onDone={() => setShowForm(false)} />
        </div>
      )}

      {/* Tabla de clientes */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
          <p className="text-[13px] text-sp-admin-muted">
            {clients.length === 0
              ? 'Todavía no hay clientes. Añade el primero.'
              : 'Sin resultados para los filtros actuales.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/30">
            {['Cliente', 'Tipo', 'NIF', 'País', 'Facturado', 'Pendiente', 'Facturas', ''].map((h) => (
              <span key={h} className={`text-[9px] font-bold uppercase tracking-wider text-sp-admin-muted ${
                h === 'Cliente' ? 'flex-1' :
                h === '' ? 'w-20' :
                'hidden sm:inline w-24 text-right'
              }`}>{h}</span>
            ))}
          </div>

          {filtered.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              invoicesForClient={invByClient.get(client.id) ?? []}
              brands={brands}
            />
          ))}
        </div>
      )}
    </div>
  );
}
