'use client';

import { useTransition } from 'react';

import {
  annulInvoiceAction,
  deleteInvoiceAction,
  markInvoicePaidAction,
} from '@/app/admin/(dashboard)/facturacion/invoices-actions';
import { StateBadge, type Tone } from '@/features/admin/_shared/components/StateBadge';
import {
  INVOICE_COMPANY_LABELS,
  INVOICE_PAYMENT_METHOD_LABELS,
  INVOICE_STATUS_LABELS,
} from '@/lib/schemas/invoice';

import type { InvoiceWithRelations, InvoiceKind, InvoiceStatus } from '@/types';

export type BrandOption = { readonly id: number; readonly name: string };
export type TalentOption = { readonly id: number; readonly name: string };
export type CampaignOption = { readonly id: number; readonly label: string };

export const KIND_LABELS: Record<InvoiceKind, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
};

export const STATUS_TONES: Record<InvoiceStatus, Tone> = {
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

export const INPUT =
  'rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
export const BTN_PRIMARY =
  'rounded-full bg-sp-admin-accent px-4 py-2 text-sm font-bold text-sp-admin-bg transition-opacity hover:opacity-90 cursor-pointer';
export const BTN_GHOST =
  'rounded-full px-3 py-1.5 text-xs font-semibold text-sp-admin-muted transition-colors hover:bg-sp-admin-hover hover:text-sp-admin-text cursor-pointer';

export function formatMoney(amount: string | number, currency: string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES');
}

type InvoiceRowProps = {
  readonly invoice: InvoiceWithRelations;
  readonly canDelete: boolean;
  readonly onEdit: () => void;
};

export function InvoiceRow({ invoice, canDelete, onEdit }: InvoiceRowProps): React.ReactElement {
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
