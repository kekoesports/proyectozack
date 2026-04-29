'use client';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';

import type { Tone } from '@/features/admin/_shared/components/StateBadge';
import type { Invoice } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_TONE: Record<Invoice['status'], Tone> = {
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

const STATUS_LABEL: Record<Invoice['status'], string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  cobrada: 'Cobrada',
  vencida: 'Vencida',
  anulada: 'Anulada',
  pagada: 'Pagada',
  parcial: 'Parcial',
  no_cobrada: 'No cobrada',
  no_pagada: 'No pagada',
};

const KIND_LABEL: Record<Invoice['kind'], string> = {
  income: 'Factura marca',
  expense: 'Pago creador',
};

// ── Main component ─────────────────────────────────────────────────────────────

type Props = {
  readonly invoices: readonly Invoice[];
};

/**
 * Sección del detalle de campaña que muestra los pagos reales vinculados (invoices con `campaignId`).
 *
 * @kind client
 * @feature admin/campaigns
 * @route /admin/campanas/[id]
 */
export function CampaignPayments({ invoices }: Props): React.ReactElement {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
        <div className="flex items-center justify-between p-5 border-b border-sp-admin-border">
          <h2 className="font-bold text-sp-admin-text text-sm">Facturas vinculadas</h2>
          <button
            type="button"
            disabled
            title="Disponible en Fase 5"
            className="rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-muted opacity-50 cursor-not-allowed"
          >
            + Crear factura
          </button>
        </div>
        <EmptyState
          title="Sin facturas vinculadas"
          description="Las facturas asociadas a esta campaña aparecerán aquí."
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-sp-admin-border">
        <h2 className="font-bold text-sp-admin-text text-sm">
          Facturas vinculadas{' '}
          <span className="text-sp-admin-muted font-normal">({invoices.length})</span>
        </h2>
        <button
          type="button"
          disabled
          title="Disponible en Fase 5"
          className="rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-muted opacity-50 cursor-not-allowed"
        >
          + Crear factura
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border">
              <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                Tipo
              </th>
              <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                Concepto
              </th>
              <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                Importe
              </th>
              <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                Estado
              </th>
              <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-border/10 transition-colors"
              >
                <td className="px-5 py-3 text-sp-admin-muted text-xs">
                  {KIND_LABEL[inv.kind]}
                </td>
                <td className="px-5 py-3 text-sp-admin-text max-w-[200px] truncate">
                  {inv.concept}
                </td>
                <td className="px-5 py-3 text-sp-admin-text text-right font-semibold tabular-nums">
                  {EUR.format(Number(inv.totalAmount))}
                </td>
                <td className="px-5 py-3">
                  <StateBadge tone={STATUS_TONE[inv.status]}>
                    {STATUS_LABEL[inv.status]}
                  </StateBadge>
                </td>
                <td className="px-5 py-3 text-sp-admin-muted text-xs">
                  {formatDate(inv.issueDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
