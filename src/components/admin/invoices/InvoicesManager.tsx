'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

import {
  annulInvoiceAction,
  deleteInvoiceAction,
  markInvoicePaidAction,
} from '@/app/admin/(dashboard)/facturacion/invoices-actions';
import { StateBadge, type Tone } from '@/components/admin/ui/StateBadge';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { InvoiceDrawer } from './InvoiceDrawer';
import {
  INVOICE_COMPANY_LABELS,
  INVOICE_PAYMENT_METHOD_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
} from '@/lib/schemas/invoice';

import type { InvoiceWithRelations, InvoiceKind, InvoiceStatus } from '@/types';

type BrandOption = { readonly id: number; readonly name: string };
type TalentOption = { readonly id: number; readonly name: string };
type CampaignOption = { readonly id: number; readonly label: string };

const KIND_LABELS: Record<InvoiceKind, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
};

const STATUS_TONES: Record<InvoiceStatus, Tone> = {
  borrador: 'neutral',
  emitida: 'warning',
  cobrada: 'success',
  vencida: 'danger',
  anulada: 'neutral',
  pagada: 'success',
  parcial: 'info',
  no_cobrada: 'warning',
  no_pagada: 'warning',
};

const INPUT =
  'rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const BTN_PRIMARY =
  'rounded-full bg-sp-admin-accent px-4 py-2 text-sm font-bold text-sp-admin-bg transition-opacity hover:opacity-90 cursor-pointer';
const BTN_GHOST =
  'rounded-full px-3 py-1.5 text-xs font-semibold text-sp-admin-muted transition-colors hover:bg-sp-admin-hover hover:text-sp-admin-text cursor-pointer';

type Props = {
  readonly invoices: readonly InvoiceWithRelations[];
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly campaigns: readonly CampaignOption[];
  readonly categories: readonly string[];
  readonly canDelete: boolean;
};

function formatMoney(amount: string | number, currency: string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES');
}

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

type InvoiceRowProps = {
  readonly invoice: InvoiceWithRelations;
  readonly canDelete: boolean;
  readonly onEdit: () => void;
};

function InvoiceRow({ invoice, canDelete, onEdit }: InvoiceRowProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const counterparty = invoice.brandName ?? invoice.talentName ?? invoice.counterpartyName ?? '—';

  const onDelete = (): void => {
    if (!confirm(`¿Eliminar factura "${invoice.concept}"?`)) return;
    startTransition(async () => {
      await deleteInvoiceAction(invoice.id);
    });
  };

  const onAnnul = (): void => {
    if (!confirm(`¿Anular factura "${invoice.concept}"?`)) return;
    startTransition(async () => {
      await annulInvoiceAction(invoice.id);
    });
  };

  const onMarkPaid = (): void => {
    startTransition(async () => {
      await markInvoicePaidAction(invoice.id);
    });
  };

  const attachmentUrl = invoice.invoiceFile?.url ?? invoice.fileUrl ?? null;

  return (
    <tr className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${invoice.kind === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {KIND_LABELS[invoice.kind]}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-sp-admin-muted">{invoice.number ?? '—'}</td>
      <td className="px-4 py-3 text-sp-admin-muted text-xs">{formatDate(invoice.issueDate)}</td>
      <td className="px-4 py-3 text-sp-admin-text">
        <p className="line-clamp-1 max-w-xs">{invoice.concept}</p>
        <p className="text-[10px] uppercase tracking-wider text-sp-admin-muted mt-0.5">
          {invoice.category ?? '—'}
          {invoice.campaignId ? ` · campaña #${invoice.campaignId}` : ''}
        </p>
        <p className="text-[10px] text-sp-admin-muted/80">{counterparty}</p>
      </td>
      <td className="px-4 py-3 text-sp-admin-muted text-xs">
        {invoice.company ? INVOICE_COMPANY_LABELS[invoice.company] : '—'}
      </td>
      <td className="px-4 py-3 text-sp-admin-muted text-xs">
        {invoice.paymentMethod ? INVOICE_PAYMENT_METHOD_LABELS[invoice.paymentMethod] : '—'}
      </td>
      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${invoice.kind === 'income' ? 'text-emerald-400' : 'text-amber-400'}`}>
        {invoice.kind === 'expense' ? '-' : ''}{formatMoney(invoice.totalAmount, invoice.currency)}
      </td>
      <td className="px-4 py-3">
        <StateBadge tone={STATUS_TONES[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</StateBadge>
      </td>
      <td className="px-4 py-3 text-xs">
        {attachmentUrl ? (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className="text-sp-admin-accent hover:underline">
            Ver
          </a>
        ) : (
          <span className="text-sp-admin-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {invoice.kind === 'income' && invoice.status !== 'cobrada' && invoice.status !== 'pagada' && invoice.status !== 'anulada' && (
          <button type="button" onClick={onMarkPaid} disabled={isPending} className="px-2 py-1 rounded text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 cursor-pointer">
            Cobrada
          </button>
        )}
        <button type="button" onClick={onEdit} className={BTN_GHOST}>Editar</button>
        {invoice.status !== 'anulada' && (
          <button type="button" onClick={onAnnul} disabled={isPending} className="px-2 py-1 rounded text-[10px] font-bold text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 cursor-pointer">
            Anular
          </button>
        )}
        {canDelete && (
          <button type="button" onClick={onDelete} disabled={isPending} className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer">
            Borrar
          </button>
        )}
      </td>
    </tr>
  );
}
