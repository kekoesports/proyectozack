'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CampaignWithRelations, InvoiceWithRelations } from '@/types';

type Props = {
  readonly campaigns: readonly CampaignWithRelations[];
  readonly invoices?:  readonly InvoiceWithRelations[];
};

type BrandRow = {
  id:           number;
  name:         string;
  deals:        number;
  revenue:      number;
  margin:       number;
  pendingCobro: number;
  activeDeals:  number;
  lastDeal:     string;
};

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

type SortKey = 'revenue' | 'margin' | 'deals' | 'pendingCobro';

type ThProps = { label: string; k?: SortKey; right?: boolean; sortKey: SortKey; asc: boolean; onSort: (k: SortKey) => void };
function SortTh({ label, k, right, sortKey, asc, onSort }: ThProps): React.ReactElement {
  return (
    <th
      onClick={() => k && onSort(k)}
      className={`px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] whitespace-nowrap select-none ${right ? 'text-right' : 'text-left'} ${k ? 'cursor-pointer hover:text-sp-admin-text' : ''}`}
    >
      {label}{k && sortKey === k && <span className="ml-1 text-sp-admin-accent">{asc ? '↑' : '↓'}</span>}
    </th>
  );
}

export function BrandRankingTable({ campaigns, invoices = [] }: Props): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [asc, setAsc]         = useState(false);

  // Pendiente cobro real desde invoices (más preciso que brandPaid derivado)
  const hasInvoices = invoices.length > 0;
  const pendingByBrand = useMemo(() => {
    const map = new Map<number, number>();
    if (!hasInvoices) return map;
    for (const inv of invoices) {
      if (inv.kind !== 'income' || !inv.brandId) continue;
      if (['pendiente', 'emitida', 'no_cobrada', 'no_cobrado', 'parcial', 'vencida'].includes(inv.status)) {
        map.set(inv.brandId, (map.get(inv.brandId) ?? 0) + Number(inv.totalAmount));
      }
    }
    return map;
  }, [invoices, hasInvoices]);

  const rows = useMemo((): BrandRow[] => {
    const map = new Map<number, BrandRow>();
    for (const c of campaigns) {
      if (!c.brandId || !c.brandName) continue;
      const r  = Number(c.amountBrand  ?? 0);
      const co = Number(c.amountTalent ?? 0);
      const existing = map.get(c.brandId) ?? {
        id: c.brandId, name: c.brandName, deals: 0, revenue: 0,
        margin: 0, pendingCobro: 0, activeDeals: 0, lastDeal: String(c.createdAt),
      };
      existing.deals++;
      if (c.status !== 'cancelada') {
        existing.revenue += r;
        existing.margin  += r - co;
        // pendingCobro: usa invoices si están disponibles, si no fallback a campaign
        if (!hasInvoices && c.brandPaid === 'no') existing.pendingCobro += r;
      }
      if (c.status === 'activa') existing.activeDeals++;
      const d = String(c.createdAt);
      if (d > existing.lastDeal) existing.lastDeal = d;
      map.set(c.brandId, existing);
    }
    // Sobreescribir pendingCobro con datos reales de invoices si disponibles
    if (hasInvoices) {
      for (const [id, row] of map.entries()) {
        row.pendingCobro = pendingByBrand.get(id) ?? 0;
      }
    }
    return [...map.values()].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return asc ? diff : -diff;
    });
  }, [campaigns, sortKey, asc, hasInvoices, pendingByBrand]);

  function handleSort(k: SortKey): void {
    if (sortKey === k) setAsc((v) => !v);
    else { setSortKey(k); setAsc(false); }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
        <p className="text-[13px] text-sp-admin-muted">Sin datos de marcas para los filtros seleccionados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
            <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] w-6 text-center">#</th>
            <SortTh label="Marca"     sortKey={sortKey} asc={asc} onSort={handleSort} />
            <SortTh label="Tratos"    k="deals"        sortKey={sortKey} asc={asc} onSort={handleSort} />
            <SortTh label="Revenue"   k="revenue"  right sortKey={sortKey} asc={asc} onSort={handleSort} />
            <SortTh label="Margen"    k="margin"   right sortKey={sortKey} asc={asc} onSort={handleSort} />
            <SortTh label="Pdte cobro" k="pendingCobro" right sortKey={sortKey} asc={asc} onSort={handleSort} />
            <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] text-center hidden md:table-cell">Activos</th>
            <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] hidden lg:table-cell">Último trato</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const marginPct = row.revenue > 0 ? Math.round((row.margin / row.revenue) * 100) : null;
            return (
              <tr key={row.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/50 transition-colors">
                <td className="px-3 py-2.5 text-[10px] text-sp-admin-muted/50 text-center tabular-nums">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <Link href={`/admin/brands/${row.id}`}
                    className="text-[13px] font-semibold text-sp-admin-text hover:text-sp-admin-accent transition-colors truncate block max-w-[180px]">
                    {row.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-sp-admin-muted tabular-nums text-center">{row.deals}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className="text-[13px] font-bold text-emerald-700">{fmt(row.revenue)}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className={`text-[12px] font-semibold ${row.margin >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                    {fmt(row.margin)}
                  </span>
                  {marginPct !== null && (
                    <span className="ml-1.5 text-[9px] text-sp-admin-muted/60">({marginPct}%)</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {row.pendingCobro > 0
                    ? <span className="text-[12px] font-semibold text-amber-600">{fmt(row.pendingCobro)}</span>
                    : <span className="text-[11px] text-emerald-600">✓</span>
                  }
                </td>
                <td className="px-3 py-2.5 text-center hidden md:table-cell">
                  {row.activeDeals > 0
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{row.activeDeals}</span>
                    : <span className="text-sp-admin-muted/40 text-[11px]">—</span>
                  }
                </td>
                <td className="px-3 py-2.5 text-[11px] text-sp-admin-muted hidden lg:table-cell">
                  {new Date(row.lastDeal).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                </td>
              </tr>
            );
          })}
        </tbody>
        {rows.length > 1 && (
          <tfoot>
            <tr className="border-t border-sp-admin-border bg-sp-admin-hover/30">
              <td className="px-3 py-2" colSpan={3} />
              <td className="px-3 py-2 text-right text-[12px] font-bold text-emerald-700 tabular-nums">
                {fmt(rows.reduce((s, r) => s + r.revenue, 0))}
              </td>
              <td className="px-3 py-2 text-right text-[12px] font-bold text-blue-700 tabular-nums">
                {fmt(rows.reduce((s, r) => s + r.margin, 0))}
              </td>
              <td className="px-3 py-2 text-right text-[12px] font-semibold text-amber-600 tabular-nums">
                {fmt(rows.reduce((s, r) => s + r.pendingCobro, 0))}
              </td>
              <td colSpan={2} className="hidden md:table-cell" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
