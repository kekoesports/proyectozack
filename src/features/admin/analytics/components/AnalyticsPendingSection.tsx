'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { CampaignWithRelations, InvoiceWithRelations } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

type DelayInfo = { days: number; label: string; color: string; bg: string };

function getDelay(dueDate: string | null): DelayInfo {
  if (!dueDate) return { days: 0, label: '—', color: '#72728a', bg: 'transparent' };
  const today = new Date().toISOString().slice(0, 10);
  const diff  = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / 86_400_000);
  if (diff < 0)   return { days: Math.abs(diff), label: `${Math.abs(diff)}d retraso`, color: '#ef4444', bg: '#fef2f2' };
  if (diff === 0) return { days: 0,              label: 'Hoy',                         color: '#f59e0b', bg: '#fffbeb' };
  if (diff <= 7)  return { days: diff,            label: `${diff}d restantes`,          color: '#f59e0b', bg: '#fffbeb' };
  return               { days: diff,              label: `${diff}d`,                    color: '#16a34a', bg: 'transparent' };
}

// ── Tipos de pendientes ───────────────────────────────────────────────

const PENDING_INCOME_STATUSES = ['pendiente', 'emitida', 'no_cobrada', 'no_cobrado', 'parcial', 'vencida'];
const PENDING_EXPENSE_STATUSES = ['pendiente', 'emitida', 'no_pagada', 'no_pagado', 'parcial', 'vencida'];

type PendingRow = {
  readonly invoiceId:   number;
  readonly campaignId:  number | null;
  readonly name:        string;
  readonly entity:      string;
  readonly importe:     number;
  readonly dueDate:     string | null;
  readonly delay:       DelayInfo;
  readonly href:        string;
};

// ── Tabla genérica ────────────────────────────────────────────────────

function PendingTable({
  rows, entityLabel, emptyMsg,
}: {
  readonly rows:        readonly PendingRow[];
  readonly entityLabel: string;
  readonly emptyMsg:    string;
}): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-[12px] font-medium text-emerald-700">✓ {emptyMsg}</p>
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + r.importe, 0);
  const overdue = rows.filter((r) => r.delay.days > 0 && r.delay.color === '#ef4444').length;

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      {/* Mini-KPIs */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/30">
        <span className="text-[11px] text-sp-admin-muted">
          <strong className="text-sp-admin-text">{rows.length}</strong> pendientes
        </span>
        <span className="text-[11px] text-sp-admin-muted">
          Total: <strong className="text-sp-admin-text tabular-nums">{EUR.format(total)}</strong>
        </span>
        {overdue > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>
            {overdue} vencidos
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-sp-admin-border">
              {['Trato', entityLabel, 'Importe', 'Vencimiento', 'Estado'].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.invoiceId}
                className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors"
                style={row.delay.color === '#ef4444' ? { background: '#fff5f5' } : undefined}>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Link href={row.href}
                    className="text-[12px] font-medium text-sp-admin-accent hover:underline truncate block max-w-[160px]"
                    title={row.name}>
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-sp-admin-text whitespace-nowrap">
                  {row.entity}
                </td>
                <td className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-sp-admin-text whitespace-nowrap">
                  {EUR.format(row.importe)}
                </td>
                <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted whitespace-nowrap">
                  {fmtDate(row.dueDate)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ color: row.delay.color, background: row.delay.bg || `${row.delay.color}15` }}>
                    {row.delay.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

type Props = {
  readonly invoices:  readonly InvoiceWithRelations[];
  readonly campaigns: readonly CampaignWithRelations[];
};

export function AnalyticsPendingSection({ invoices, campaigns }: Props): React.ReactElement {
  // Mapa campaignId → nombre del trato
  const campaignMap = useMemo(() => {
    const m = new Map<number, { name: string; brandName: string | null; talentName: string | null }>();
    for (const c of campaigns) m.set(c.id, { name: c.name, brandName: c.brandName, talentName: c.talentName });
    return m;
  }, [campaigns]);

  // Pendiente de cobro (ingresos)
  const pendingCobro = useMemo((): PendingRow[] => {
    return invoices
      .filter((i) => i.kind === 'income' && PENDING_INCOME_STATUSES.includes(i.status))
      .map((inv) => {
        const camp = inv.campaignId ? campaignMap.get(inv.campaignId) : null;
        const name = camp?.name ?? inv.concept;
        const delay = getDelay(inv.dueDate);
        return {
          invoiceId:  inv.id,
          campaignId: inv.campaignId,
          name,
          entity: inv.brandName ?? camp?.brandName ?? inv.counterpartyName ?? '—',
          importe: Number(inv.totalAmount),
          dueDate: inv.dueDate,
          delay,
          href: inv.campaignId ? `/admin/campanas/${inv.campaignId}` : '/admin/facturacion',
        };
      })
      .sort((a, b) => {
        // Vencidos primero, luego por fecha ascendente
        if (a.delay.color === '#ef4444' && b.delay.color !== '#ef4444') return -1;
        if (b.delay.color === '#ef4444' && a.delay.color !== '#ef4444') return  1;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [invoices, campaignMap]);

  // Pendiente de pago a talento (gastos)
  const pendingPago = useMemo((): PendingRow[] => {
    return invoices
      .filter((i) => i.kind === 'expense' && PENDING_EXPENSE_STATUSES.includes(i.status))
      .map((inv) => {
        const camp = inv.campaignId ? campaignMap.get(inv.campaignId) : null;
        const name = camp?.name ?? inv.concept;
        const delay = getDelay(inv.dueDate);
        return {
          invoiceId:  inv.id,
          campaignId: inv.campaignId,
          name,
          entity: inv.talentName ?? camp?.talentName ?? inv.counterpartyName ?? '—',
          importe: Number(inv.totalAmount),
          dueDate: inv.dueDate,
          delay,
          href: inv.campaignId ? `/admin/campanas/${inv.campaignId}` : '/admin/facturacion',
        };
      })
      .sort((a, b) => {
        if (a.delay.color === '#ef4444' && b.delay.color !== '#ef4444') return -1;
        if (b.delay.color === '#ef4444' && a.delay.color !== '#ef4444') return  1;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [invoices, campaignMap]);

  const noPending = pendingCobro.length === 0 && pendingPago.length === 0;

  return (
    <div className="space-y-4">
      {noPending && invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
          <p className="text-[13px] text-sp-admin-muted">Sin movimientos de facturación registrados.</p>
          <p className="text-[11px] text-sp-admin-muted/70 mt-1">Registra ingresos y gastos en Facturación para verlos aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pendiente cobro */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>
              <h3 className="text-[12px] font-bold text-sp-admin-text">Pendiente de cobro (marca)</h3>
            </div>
            <PendingTable
              rows={pendingCobro}
              entityLabel="Marca"
              emptyMsg="Sin cobros pendientes"
            />
          </div>
          {/* Pendiente pago talento */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>
              <h3 className="text-[12px] font-bold text-sp-admin-text">Pendiente de pago (talento)</h3>
            </div>
            <PendingTable
              rows={pendingPago}
              entityLabel="Talento"
              emptyMsg="Sin pagos pendientes a talentos"
            />
          </div>
        </div>
      )}
    </div>
  );
}
