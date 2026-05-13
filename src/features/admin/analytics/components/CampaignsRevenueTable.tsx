'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CampaignWithRelations } from '@/types';

type Props = { readonly campaigns: readonly CampaignWithRelations[] };

type SortKey = 'revenue' | 'cost' | 'margin' | 'marginPct' | 'name';

function rev(c: CampaignWithRelations): number   { return Number(c.amountBrand ?? 0); }
function cost(c: CampaignWithRelations): number  { return Number(c.amountTalent ?? 0); }
function margin(c: CampaignWithRelations): number { return rev(c) - cost(c); }
function mPct(c: CampaignWithRelations): number  {
  const r = rev(c);
  return r > 0 ? (margin(c) / r) * 100 : 0;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function sortCampaigns(list: readonly CampaignWithRelations[], key: SortKey, asc: boolean): CampaignWithRelations[] {
  return [...list].sort((a, b) => {
    let diff = 0;
    if (key === 'revenue')    diff = rev(a) - rev(b);
    else if (key === 'cost')  diff = cost(a) - cost(b);
    else if (key === 'margin')diff = margin(a) - margin(b);
    else if (key === 'marginPct') diff = mPct(a) - mPct(b);
    else diff = a.name.localeCompare(b.name);
    return asc ? diff : -diff;
  });
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  propuesta:      { label: 'Propuesta',      cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  negociacion:    { label: 'Negociación',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  aprobada:       { label: 'Aprobada',       cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  activa:         { label: 'Activa',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completada:     { label: 'Completada',     cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelada:      { label: 'Cancelada',      cls: 'bg-red-50 text-red-400 border-red-100' },
  pendiente_pago: { label: 'Pdte. pago',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pagada:         { label: 'Pagada',         cls: 'bg-teal-50 text-teal-700 border-teal-200' },
};
const STATUS_FALLBACK = { label: 'Desconocido', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' };

function MarginBar({ pct }: { readonly pct: number }): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = pct >= 25 ? '#16a34a' : pct >= 10 ? '#f59e0b' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-sp-admin-border overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${clamped}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

type ThProps = {
  readonly label: string;
  readonly sortKey?: SortKey;
  readonly current: SortKey;
  readonly asc: boolean;
  readonly onSort: (k: SortKey) => void;
  readonly right?: boolean;
  readonly hidden?: string;
};

function Th({ label, sortKey, current, asc, onSort, right, hidden }: ThProps): React.ReactElement {
  const active = sortKey && current === sortKey;
  return (
    <th
      className={`px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${sortKey ? 'cursor-pointer hover:text-sp-admin-text' : ''} ${hidden ?? ''}`}
      onClick={() => sortKey && onSort(sortKey)}
    >
      {label}
      {active && <span className="ml-1 text-sp-admin-accent">{asc ? '↑' : '↓'}</span>}
    </th>
  );
}

export function CampaignsRevenueTable({ campaigns }: Props): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [asc,     setAsc]     = useState(false);

  function handleSort(key: SortKey): void {
    if (sortKey === key) setAsc((v) => !v);
    else { setSortKey(key); setAsc(false); }
  }

  const sorted = sortCampaigns(campaigns, sortKey, asc);
  const withRevenue = campaigns.filter((c) => rev(c) > 0).length;
  const noRevenue   = campaigns.length - withRevenue;

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
        <p className="text-sm text-sp-admin-muted">Sin campañas para los filtros seleccionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-sp-admin-muted">
          Campañas — {campaigns.length} resultado{campaigns.length !== 1 ? 's' : ''}
          {noRevenue > 0 && <span className="text-sp-admin-muted/50"> · {noRevenue} sin revenue</span>}
        </p>
        <p className="text-[9px] text-sp-admin-muted/60">Haz clic en las cabeceras para ordenar</p>
      </div>

      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
              <Th label="Campaña"    sortKey="name"      current={sortKey} asc={asc} onSort={handleSort} />
              <Th label="Marca"      current={sortKey} asc={asc} onSort={handleSort} hidden="hidden md:table-cell" />
              <Th label="Influencer" current={sortKey} asc={asc} onSort={handleSort} hidden="hidden lg:table-cell" />
              <Th label="Revenue"    sortKey="revenue"   current={sortKey} asc={asc} onSort={handleSort} right />
              <Th label="Coste"      sortKey="cost"      current={sortKey} asc={asc} onSort={handleSort} right hidden="hidden md:table-cell" />
              <Th label="Margen"     sortKey="margin"    current={sortKey} asc={asc} onSort={handleSort} right />
              <Th label="Margen %"   sortKey="marginPct" current={sortKey} asc={asc} onSort={handleSort} hidden="hidden lg:table-cell" />
              <Th label="Estado"     current={sortKey} asc={asc} onSort={handleSort} />
              <Th label="Cobrado"    current={sortKey} asc={asc} onSort={handleSort} hidden="hidden xl:table-cell" />
              <Th label="Pagado"     current={sortKey} asc={asc} onSort={handleSort} hidden="hidden xl:table-cell" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const r = rev(c);
              const m = margin(c);
              const mp = mPct(c);
              const cfg = STATUS_CFG[c.status] ?? STATUS_FALLBACK;
              const hasRevenue = r > 0;

              return (
                <tr
                  key={c.id}
                  className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/50 transition-colors group/row"
                >
                  {/* Campaña */}
                  <td className="px-3 py-2.5 max-w-[220px]">
                    <Link
                      href={`/admin/campanas`}
                      className="text-[12px] font-semibold text-sp-admin-text hover:text-sp-admin-accent transition-colors truncate block"
                    >
                      {c.name}
                    </Link>
                    {c.sector && (
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-sp-admin-muted/60 mt-0.5 truncate">
                        {c.sector}
                      </p>
                    )}
                  </td>

                  {/* Marca */}
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    {c.brandName ? (
                      <Link href="/admin/brands" className="text-[12px] text-sp-admin-muted hover:text-sp-admin-accent transition-colors truncate block max-w-[120px]">
                        {c.brandName}
                      </Link>
                    ) : (
                      <span className="text-[11px] text-sp-admin-muted/40">—</span>
                    )}
                  </td>

                  {/* Influencer */}
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    {c.talentName ? (
                      <span className="text-[12px] text-sp-admin-muted truncate block max-w-[120px]">
                        {c.talentName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-sp-admin-muted/40">—</span>
                    )}
                  </td>

                  {/* Revenue */}
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {hasRevenue ? (
                      <span className="text-[13px] font-bold text-emerald-700">{fmt(r)}</span>
                    ) : (
                      <span className="text-[11px] text-sp-admin-muted/40">—</span>
                    )}
                  </td>

                  {/* Coste */}
                  <td className="px-3 py-2.5 text-right tabular-nums hidden md:table-cell">
                    {cost(c) > 0 ? (
                      <span className="text-[12px] text-amber-700">{fmt(cost(c))}</span>
                    ) : (
                      <span className="text-[11px] text-sp-admin-muted/40">—</span>
                    )}
                  </td>

                  {/* Margen */}
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {hasRevenue ? (
                      <span className={`text-[12px] font-semibold ${m >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                        {fmt(m)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-sp-admin-muted/40">—</span>
                    )}
                  </td>

                  {/* Margen % */}
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    {hasRevenue ? <MarginBar pct={mp} /> : <span className="text-[11px] text-sp-admin-muted/40">—</span>}
                  </td>

                  {/* Estado */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </td>

                  {/* Cobrado */}
                  <td className="px-3 py-2.5 hidden xl:table-cell">
                    {c.brandPaid !== 'no' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {c.brandPaid === 'parcial' ? 'Parcial' : 'Sí'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        No
                      </span>
                    )}
                  </td>

                  {/* Pagado al talent */}
                  <td className="px-3 py-2.5 hidden xl:table-cell">
                    {c.talentPaid !== 'no' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {c.talentPaid === 'parcial' ? 'Parcial' : 'Sí'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                        No
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totales */}
          {campaigns.length > 1 && (
            <tfoot>
              <tr className="border-t border-sp-admin-border bg-sp-admin-hover/30">
                <td className="px-3 py-2.5 text-[10px] font-bold text-sp-admin-muted" colSpan={3}>
                  Total ({sorted.length})
                </td>
                <td className="px-3 py-2.5 text-right text-[12px] font-bold text-emerald-700 tabular-nums">
                  {fmt(sorted.reduce((s, c) => s + rev(c), 0))}
                </td>
                <td className="px-3 py-2.5 text-right text-[12px] font-semibold text-amber-700 tabular-nums hidden md:table-cell">
                  {fmt(sorted.reduce((s, c) => s + cost(c), 0))}
                </td>
                <td className="px-3 py-2.5 text-right text-[12px] font-bold text-blue-700 tabular-nums">
                  {fmt(sorted.reduce((s, c) => s + margin(c), 0))}
                </td>
                <td colSpan={4} className="hidden lg:table-cell" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
