'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  bulkDeleteInvoicesAction,
} from '@/app/admin/(dashboard)/facturacion/invoices-actions';
import { BillingStatusBadge } from './BillingStatusBadge';
import { BillingMovementModal } from './BillingMovementModal';
import {
  BILLING_ENTITIES,
  BILLING_PAYMENT_METHODS,
  BILLING_CATEGORIES,
  INCOME_STATUSES,
  EXPENSE_STATUSES,
} from '@/lib/schemas/invoice';
import type { InvoiceWithRelations, InvoiceKind, InvoiceStatus } from '@/types';

type BrandOption    = { readonly id: number; readonly name: string };
type TalentOption   = { readonly id: number; readonly name: string };
type CampaignOption = { readonly id: number; readonly name: string; readonly brandId: number | null; readonly talentId: number | null };

type Props = {
  readonly invoices:  readonly InvoiceWithRelations[];
  readonly brands:    readonly BrandOption[];
  readonly talents:   readonly TalentOption[];
  readonly campaigns: readonly CampaignOption[];
};

const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const BTN_PRIMARY = 'px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 transition-colors cursor-pointer';
const BTN_GHOST   = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer border border-sp-admin-border';

const ALL_STATUSES = [...INCOME_STATUSES, ...EXPENSE_STATUSES].filter(
  (v, i, a) => a.indexOf(v) === i,
) as InvoiceStatus[];

function formatMoney(amount: string | number, currency: string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const cur = ['EUR', 'USD', 'GBP'].includes(currency) ? currency : 'EUR';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function InvoicesManager({ invoices, brands, talents, campaigns }: Props): React.ReactElement {
  const [showCreate, setShowCreate]   = useState(false);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Selección masiva
  const [selected,       setSelected]       = useState<ReadonlySet<number>>(new Set());
  const [isPending,      startTransition]   = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [search, setSearch]                 = useState('');
  const [filterKind, setFilterKind]         = useState<'all' | InvoiceKind>('all');
  const [filterStatus, setFilterStatus]     = useState<'all' | InvoiceStatus>('all');
  const [filterEntity, setFilterEntity]     = useState('');
  const [filterBrand, setFilterBrand]       = useState('');
  const [filterTalent, setFilterTalent]     = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterMethod, setFilterMethod]     = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom]         = useState('');
  const [filterTo, setFilterTo]             = useState('');

  const filtered = useMemo(() => {
    let result = invoices;
    if (filterKind !== 'all')  result = result.filter((i) => i.kind === filterKind);
    if (filterStatus !== 'all') result = result.filter((i) => i.status === filterStatus);
    if (filterEntity)   result = result.filter((i) => i.entity === filterEntity);
    if (filterBrand)    result = result.filter((i) => String(i.brandId ?? '') === filterBrand);
    if (filterTalent)   result = result.filter((i) => String(i.talentId ?? '') === filterTalent);
    if (filterCampaign) result = result.filter((i) => String(i.campaignId ?? '') === filterCampaign);
    if (filterMethod)   result = result.filter((i) => i.paymentMethod === filterMethod);
    if (filterCategory) result = result.filter((i) => i.category === filterCategory);
    if (filterFrom)     result = result.filter((i) => i.issueDate >= filterFrom);
    if (filterTo)       result = result.filter((i) => i.issueDate <= filterTo);
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((i) =>
        i.concept.toLowerCase().includes(q) ||
        (i.number ?? '').toLowerCase().includes(q) ||
        (i.brandName ?? '').toLowerCase().includes(q) ||
        (i.talentName ?? '').toLowerCase().includes(q) ||
        (i.campaignName ?? '').toLowerCase().includes(q) ||
        (i.counterpartyName ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [invoices, filterKind, filterStatus, filterEntity, filterBrand, filterTalent, filterCampaign, filterMethod, filterCategory, filterFrom, filterTo, search]);

  const activeFilterCount = [filterEntity, filterBrand, filterTalent, filterCampaign, filterMethod, filterCategory, filterFrom, filterTo].filter(Boolean).length;

  // Lógica de selección masiva
  const filteredIds    = useMemo(() => filtered.map((i) => i.id), [filtered]);
  const allSelected    = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someSelected   = !allSelected && filteredIds.some((id) => selected.has(id));
  const selectedInView = filteredIds.filter((id) => selected.has(id));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleSelectAll(): void {
    setSelected(allSelected ? new Set() : new Set(filteredIds));
  }
  function toggleOne(id: number): void {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function handleBulkDelete(): void {
    const ids = [...selectedInView];
    if (!confirm(`¿Eliminar ${ids.length} movimiento${ids.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      await bulkDeleteInvoicesAction(ids);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {/* Toolbar principal */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar concepto, marca, influencer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT_SM} flex-1 min-w-[180px]`}
        />
        <select value={filterKind} onChange={(e) => setFilterKind(e.target.value as 'all' | InvoiceKind)} className={INPUT_SM}>
          <option value="all">Ingresos y gastos</option>
          <option value="income">Solo ingresos</option>
          <option value="expense">Solo gastos</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | InvoiceStatus)} className={INPUT_SM}>
          <option value="all">Todos los estados</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          className={`${BTN_GHOST} flex items-center gap-1.5`}
        >
          Filtros
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sp-admin-accent text-white text-[9px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="ml-auto">
          <button type="button" onClick={() => setShowCreate(true)} className={BTN_PRIMARY}>
            + Nuevo movimiento
          </button>
        </div>
      </div>

      {/* Filtros avanzados */}
      {showMoreFilters && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Entidad</label>
            <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className={`${INPUT_SM} w-full`}>
              <option value="">Todas</option>
              {BILLING_ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Marca</label>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={`${INPUT_SM} w-full`}>
              <option value="">Todas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Influencer</label>
            <select value={filterTalent} onChange={(e) => setFilterTalent(e.target.value)} className={`${INPUT_SM} w-full`}>
              <option value="">Todos</option>
              {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Campaña</label>
            <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)} className={`${INPUT_SM} w-full`}>
              <option value="">Todas</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Método / Cuenta</label>
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className={`${INPUT_SM} w-full`}>
              <option value="">Todos</option>
              {BILLING_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Categoría</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`${INPUT_SM} w-full`}>
              <option value="">Todas</option>
              {BILLING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Desde</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={`${INPUT_SM} w-full`} />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Hasta</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={`${INPUT_SM} w-full`} />
          </div>
          {activeFilterCount > 0 && (
            <div className="md:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFilterEntity(''); setFilterBrand(''); setFilterTalent('');
                  setFilterCampaign(''); setFilterMethod(''); setFilterCategory('');
                  setFilterFrom(''); setFilterTo('');
                }}
                className="text-[11px] text-sp-admin-accent hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal crear */}
      {showCreate && (
        <BillingMovementModal
          brands={brands}
          talents={talents}
          campaigns={campaigns}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Barra de acciones masivas */}
      {selectedInView.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-[12px] font-semibold text-red-800">
            {selectedInView.length} {selectedInView.length === 1 ? 'movimiento seleccionado' : 'movimientos seleccionados'}
          </span>
          <button type="button" onClick={handleBulkDelete} disabled={isPending}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
            {isPending ? 'Eliminando…' : 'Eliminar seleccionados'}
          </button>
          <button type="button" onClick={() => setSelected(new Set())}
            className="h-7 px-3 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-100 border border-red-200 transition-colors">
            Cancelar
          </button>
        </div>
      )}

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-sm text-sp-admin-muted">
            {invoices.length === 0
              ? 'No hay movimientos. Crea el primero con "+ Nuevo movimiento".'
              : 'Ningún movimiento coincide con los filtros activos.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
                <th className="px-3 py-2.5 w-8">
                  <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    className="rounded accent-sp-admin-accent cursor-pointer" aria-label="Seleccionar todos" />
                </th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Fecha</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Tipo</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Concepto</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden md:table-cell">Marca</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden lg:table-cell">Influencer</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden xl:table-cell">Campaña</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden lg:table-cell">Entidad</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden xl:table-cell">Método</th>
                <th className="text-right px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Importe</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Estado</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden md:table-cell">Vence</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden md:table-cell">Arch.</th>
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <BillingRow
                  key={inv.id}
                  invoice={inv}
                  brands={brands}
                  talents={talents}
                  campaigns={campaigns}
                  isEditing={editingId === inv.id}
                  onEdit={() => setEditingId(editingId === inv.id ? null : inv.id)}
                  onCloseEdit={() => setEditingId(null)}
                  isSelected={selected.has(inv.id)}
                  onToggleSelect={() => toggleOne(inv.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-sp-admin-muted text-right">
        {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== invoices.length && ` (de ${invoices.length})`}
      </p>
    </div>
  );
}

// ── Fila de tabla ─────────────────────────────────────────────────────

type RowProps = {
  readonly invoice: InvoiceWithRelations;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly campaigns: readonly CampaignOption[];
  readonly isEditing: boolean;
  readonly onEdit: () => void;
  readonly onCloseEdit: () => void;
  readonly isSelected: boolean;
  readonly onToggleSelect: () => void;
};

function BillingRow({ invoice, brands, talents, campaigns, isEditing, onEdit, onCloseEdit, isSelected, onToggleSelect }: RowProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const isIncome = invoice.kind === 'income';

  const onDelete = (): void => {
    if (!confirm(`¿Anular/eliminar "${invoice.concept}"?`)) return;
    startTransition(async () => { await deleteInvoiceAction(invoice.id); });
  };

  const onMarkPaid = (): void => {
    startTransition(async () => { await markInvoicePaidAction(invoice.id); });
  };

  const canMarkPaid =
    (isIncome && (invoice.status === 'no_cobrado' || invoice.status === 'pendiente' || invoice.status === 'emitida')) ||
    (!isIncome && (invoice.status === 'no_pagado' || invoice.status === 'pendiente' || invoice.status === 'emitida'));

  const counterparty = invoice.brandName ?? invoice.talentName ?? invoice.counterpartyName;

  return (
    <>
      <tr className={`border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/50 transition-colors group/row ${isEditing ? 'bg-sp-admin-hover/60' : isSelected ? 'bg-sp-admin-accent/[0.05]' : ''}`}>
        <td className="px-3 py-2.5">
          <input type="checkbox" checked={isSelected} onChange={onToggleSelect}
            className="rounded accent-sp-admin-accent cursor-pointer" />
        </td>
        <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted tabular-nums whitespace-nowrap">
          {formatDate(invoice.issueDate)}
        </td>
        <td className="px-3 py-2.5">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            isIncome
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {isIncome ? '↑' : '↓'}
          </span>
        </td>
        <td className="px-3 py-2.5 max-w-[200px]">
          <p className="text-[12px] font-medium text-sp-admin-text truncate">{invoice.concept}</p>
          {invoice.category && (
            <p className="text-[9px] font-semibold uppercase tracking-wide text-sp-admin-muted/70 mt-0.5 truncate">{invoice.category}</p>
          )}
        </td>
        <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted truncate max-w-[100px] hidden md:table-cell">
          {invoice.brandName ?? counterparty ?? '—'}
        </td>
        <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted truncate max-w-[100px] hidden lg:table-cell">
          {invoice.talentName ?? '—'}
        </td>
        <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted truncate max-w-[120px] hidden xl:table-cell">
          {invoice.campaignName ?? '—'}
        </td>
        <td className="px-3 py-2.5 text-[10px] text-sp-admin-muted truncate max-w-[110px] hidden lg:table-cell">
          {invoice.entity ?? '—'}
        </td>
        <td className="px-3 py-2.5 text-[10px] text-sp-admin-muted truncate max-w-[110px] hidden xl:table-cell">
          {invoice.paymentMethod ?? '—'}
        </td>
        <td className={`px-3 py-2.5 text-right font-bold tabular-nums text-[12px] whitespace-nowrap ${
          isIncome ? 'text-emerald-700' : 'text-amber-700'
        }`}>
          {!isIncome && <span className="text-amber-500">−</span>}
          {formatMoney(invoice.totalAmount, invoice.currency)}
        </td>
        <td className="px-3 py-2.5">
          <BillingStatusBadge status={invoice.status} kind={invoice.kind} />
        </td>
        <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted tabular-nums whitespace-nowrap hidden md:table-cell">
          {formatDate(invoice.dueDate)}
        </td>
        <td className="px-3 py-2.5 hidden md:table-cell">
          <div className="flex items-center gap-1">
            {invoice.fileUrl && (
              <a href={invoice.fileUrl} target="_blank" rel="noreferrer" title="Ver factura"
                className="text-[9px] font-bold text-sp-admin-accent bg-sp-admin-accent/10 rounded px-1.5 py-0.5 hover:bg-sp-admin-accent/20">
                FAC
              </a>
            )}
            {invoice.receiptFileUrl && (
              <a href={invoice.receiptFileUrl} target="_blank" rel="noreferrer" title="Ver comprobante"
                className="text-[9px] font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 hover:bg-blue-100">
                CPR
              </a>
            )}
            {!invoice.fileUrl && !invoice.receiptFileUrl && (
              <span className="text-[9px] text-sp-admin-muted/40">—</span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            {canMarkPaid && (
              <button type="button" onClick={onMarkPaid} disabled={isPending}
                className="px-2 py-1 rounded text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                ✓
              </button>
            )}
            <button type="button" onClick={onEdit}
              className="px-2 py-1 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover transition-colors">
              Editar
            </button>
            <button type="button" onClick={onDelete} disabled={isPending}
              className="px-2 py-1 rounded text-[10px] font-semibold text-red-400 hover:bg-red-50 disabled:opacity-50 transition-colors">
              ×
            </button>
          </div>
        </td>
      </tr>

      {isEditing && (
        <BillingMovementModal
          invoice={invoice}
          brands={brands}
          talents={talents}
          campaigns={campaigns}
          onClose={onCloseEdit}
        />
      )}
    </>
  );
}
