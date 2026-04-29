'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { InvoiceDrawer } from './InvoiceDrawer';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
} from '@/lib/schemas/invoice';

import type { InvoiceWithRelations, InvoiceKind, InvoiceStatus } from '@/types';
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
}: Props): React.ReactElement {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null);
  const [filterKind, setFilterKind] = useState<'all' | InvoiceKind>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | InvoiceStatus>('all');
  const [showAnulled, setShowAnulled] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = invoices;
    if (!showAnulled) result = result.filter((i) => i.status !== 'anulada');
    if (filterKind !== 'all') result = result.filter((i) => i.kind === filterKind);
    if (filterStatus !== 'all') result = result.filter((i) => i.status === filterStatus);
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (i) =>
          i.concept.toLowerCase().includes(q) ||
          (i.number ?? '').toLowerCase().includes(q) ||
          (i.brandName ?? '').toLowerCase().includes(q) ||
          (i.talentName ?? '').toLowerCase().includes(q) ||
          (i.counterpartyName ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [invoices, filterKind, filterStatus, search, showAnulled]);

  const closeDrawer = (): void => {
    setDrawerOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
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
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | InvoiceStatus)} className={INPUT}>
            <option value="all">Todos los estados</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-sp-admin-muted">
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
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
            className={BTN_PRIMARY}
          >
            + Nueva factura
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={invoices.length === 0 ? 'Aún no hay facturas registradas' : 'Sin resultados'}
          description={
            invoices.length === 0
              ? 'Crea la primera factura para empezar a controlar tu contabilidad.'
              : 'Ninguna factura coincide con los filtros activos.'
          }
        />
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Nº</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Concepto</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Empresa</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Pago</th>
                <th className="text-right px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Adj.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  canDelete={canDelete}
                  onEdit={() => {
                    setEditing(inv);
                    setDrawerOpen(true);
                  }}
                />
              ))}
            </tbody>
          </table>
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
