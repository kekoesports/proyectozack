'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { InvoiceDrawer } from './InvoiceDrawer';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
} from '@/lib/schemas/invoice';

import type { InvoiceWithRelations, InvoiceKind, InvoiceScope, InvoiceStatus } from '@/types';
import {
  BTN_PRIMARY,
  INPUT,
  InvoiceRow,
  type BrandOption,
  type CampaignOption,
  type TalentOption,
} from './InvoicesManager.parts';

type Props = {
  readonly invoices: readonly InvoiceWithRelations[];
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly campaigns: readonly CampaignOption[];
  readonly categories: readonly string[];
  readonly canDelete: boolean;
  readonly isStaff?: boolean;
};

/**
 * Orquestador de la gestión de facturas: listado, filtros y drawer de edición/creación.
 *
 * @kind client
 * @feature admin/invoices
 * @route /admin/facturacion
 */
export function InvoicesManager({
  invoices,
  brands,
  talents,
  campaigns,
  categories,
  canDelete,
  isStaff = false,
}: Props): React.ReactElement {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [editing, setEditing]         = useState<InvoiceWithRelations | null>(null);
  const [filterKind, setFilterKind]   = useState<'all' | InvoiceKind>('all');
  const [filterScope, setFilterScope] = useState<'all' | InvoiceScope>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | InvoiceStatus>('all');
  const [filterBrand, setFilterBrand]   = useState<string>('all');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [showAnulled, setShowAnulled] = useState(false);
  const [search, setSearch]           = useState('');

  const filtered = useMemo(() => {
    let result = invoices;
    if (!showAnulled)      result = result.filter((i) => i.status !== 'anulada');
    if (filterKind  !== 'all')  result = result.filter((i) => i.kind  === filterKind);
    if (filterScope !== 'all')  result = result.filter((i) => i.scope === filterScope);
    if (filterStatus !== 'all') result = result.filter((i) => i.status === filterStatus);
    if (filterBrand !== 'all')  result = result.filter((i) => String(i.brandId ?? '') === filterBrand);
    if (filterCampaign !== 'all') result = result.filter((i) => String(i.campaignId ?? '') === filterCampaign);
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (i) =>
          i.concept.toLowerCase().includes(q) ||
          (i.number        ?? '').toLowerCase().includes(q) ||
          (i.brandName     ?? '').toLowerCase().includes(q) ||
          (i.talentName    ?? '').toLowerCase().includes(q) ||
          (i.campaignName  ?? '').toLowerCase().includes(q) ||
          (i.counterpartyName ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [invoices, filterKind, filterScope, filterStatus, filterBrand, filterCampaign, search, showAnulled]);

  const closeDrawer = (): void => {
    setDrawerOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {isStaff && (
        <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-blue-700">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="7" cy="7" r="5"/><path d="M7 5v4" strokeLinecap="round"/><circle cx="7" cy="3.5" r="0.5" fill="currentColor"/>
          </svg>
          <span>Ves solo los movimientos financieros de tratos asignados a ti. Para crear movimientos, accede al detalle del trato correspondiente.</span>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Buscar por concepto, número, contraparte…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT} w-72`}
          />
          <select value={filterKind} onChange={(e) => setFilterKind(e.target.value as 'all' | InvoiceKind)} className={INPUT}>
            <option value="all">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </select>
          <select value={filterScope} onChange={(e) => setFilterScope(e.target.value as 'all' | InvoiceScope)} className={INPUT}>
            <option value="all">Todo (campaña + empresa)</option>
            <option value="campaign">Solo campaña</option>
            <option value="company">Solo empresa</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | InvoiceStatus)} className={INPUT}>
            <option value="all">Todos los estados</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={INPUT}>
            <option value="all">Todas las marcas</option>
            {brands.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
          <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)} className={INPUT}>
            <option value="all">Todos los tratos</option>
            {campaigns.map((c) => <option key={c.id} value={String(c.id)}>{c.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-sp-admin-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showAnulled}
              onChange={(e) => setShowAnulled(e.target.checked)}
            />
            Mostrar anuladas
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pl"
            className="rounded-full border border-sp-admin-border px-3 py-1.5 text-xs font-semibold text-sp-admin-text transition-colors hover:bg-sp-admin-hover"
          >
            P&L
          </Link>
          <Link
            href="/admin/facturacion/exports"
            className="rounded-full border border-sp-admin-border px-3 py-1.5 text-xs font-semibold text-sp-admin-text transition-colors hover:bg-sp-admin-hover"
          >
            Exports fiscales
          </Link>
          <Link
            href="/admin/facturacion/import"
            className="rounded-full border border-sp-admin-border px-3 py-1.5 text-xs font-semibold text-sp-admin-text transition-colors hover:bg-sp-admin-hover"
          >
            Importar archivo
          </Link>
          {!isStaff && (
            <button
              type="button"
              onClick={() => { setEditing(null); setDrawerOpen(true); }}
              className={BTN_PRIMARY}
            >
              + Nueva factura
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={invoices.length === 0 ? 'Aún no hay facturas' : 'Sin resultados'}
          description={
            invoices.length === 0
              ? 'Registra la primera factura para empezar a controlar tu contabilidad.'
              : 'Ninguna factura coincide con los filtros activos.'
          }
          action={
            invoices.length === 0 ? (
              <button
                type="button"
                onClick={() => { setEditing(null); setDrawerOpen(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                + Nueva factura
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Nº</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider">Concepto</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Trato</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Marca / Influencer</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Entidad</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Cuenta</th>
                <th className="text-right px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Adj.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  canDelete={canDelete}
                  canEdit={!isStaff}
                  canAnnul={!isStaff}
                  onEdit={() => {
                    setEditing(inv);
                    setDrawerOpen(true);
                  }}
                />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {drawerOpen && editing && (
        <InvoiceDrawer
          mode="edit"
          isOpen={drawerOpen}
          invoice={editing}
          brands={brands}
          talents={talents}
          campaigns={campaigns}
          categories={categories}
          onClose={closeDrawer}
        />
      )}
      {drawerOpen && !editing && (
        <InvoiceDrawer
          mode="create"
          isOpen={drawerOpen}
          brands={brands}
          talents={talents}
          campaigns={campaigns}
          categories={categories}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
