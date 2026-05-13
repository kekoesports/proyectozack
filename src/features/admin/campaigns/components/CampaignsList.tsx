'use client';

import { useState } from 'react';
import Link from 'next/link';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { EmptyState }  from '@/features/admin/_shared/components/EmptyState';
import { CampaignFilters, EMPTY_FILTERS } from '@/features/admin/campaigns/components/CampaignFilters';
import { CampaignDrawer }                 from '@/features/admin/campaigns/components/CampaignDrawer';
import {
  CAMPAIGN_STATUS_LABELS,
  computeCampaignDerived,
} from '@/lib/schemas/campaign';

import type { CampaignRow }         from '@/types';
import type { CampaignFilterState } from '@/features/admin/campaigns/components/CampaignFilters';
import type { CrmBrandContact }     from '@/types';

import {
  EUR,
  STATUS_TONE,
  applyFilters,
  computeKpis,
  brandPayBadge,
  talentPayBadge,
  type BrandOption,
  type StaffOption,
  type TalentOption,
} from './CampaignsList.parts';
import { fmtCurrency } from '@/lib/currency';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  readonly campaigns:       readonly CampaignRow[];
  readonly isManager:       boolean;
  readonly brands:          readonly BrandOption[];
  readonly talents:         readonly TalentOption[];
  readonly staffUsers:      readonly StaffOption[];
  readonly contactsByBrand: Readonly<Record<number, readonly CrmBrandContact[]>>;
};

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, accent, sub,
}: {
  readonly label:  string;
  readonly value:  string | number;
  readonly accent: string;
  readonly sub?:   string;
}): React.ReactElement {
  return (
    <div className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{label}</p>
        <p className="text-lg font-bold mt-0.5 tabular-nums text-sp-admin-text">{value}</p>
        {sub !== undefined && <p className="text-[9px] text-sp-admin-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Pay badge ─────────────────────────────────────────────────────────────────

function PayBadge({ label, color }: { readonly label: string; readonly color: string }): React.ReactElement {
  if (label === '—') return <span className="text-sp-admin-muted text-[11px]">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: `${color}18`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ── isActive helper ───────────────────────────────────────────────────────────

function isActive(f: CampaignFilterState): boolean {
  return (
    f.search !== '' || f.status !== '' || f.brandId !== '' || f.talentId !== '' ||
    f.responsibleUserId !== '' || f.sector !== '' || f.geo !== '' ||
    f.cobroMarca !== '' || f.pagoTalento !== '' || f.showArchived
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Listado principal de tratos con KPIs, filtros, tabla y drawer de creación/edición.
 *
 * @kind client
 * @feature admin/campaigns
 * @route /admin/campanas
 */
export function CampaignsList({
  campaigns, isManager, brands, talents, staffUsers, contactsByBrand,
}: Props): React.ReactElement {
  const [filters, setFilters]       = useState<CampaignFilterState>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected]     = useState<CampaignRow | null>(null);

  const brandMap  = new Map(brands.map((b)  => [b.id,  b.name]));
  const talentMap = new Map(talents.map((t) => [t.id,  t.name]));
  const staffMap  = new Map(staffUsers.map((u) => [u.id, u.name]));

  const kpis     = computeKpis(campaigns);
  const filtered = applyFilters(campaigns, filters, brandMap, talentMap);
  const visible  = campaigns.filter((c) => c.archivedAt === null).length;

  function openCreate(): void          { setSelected(null); setDrawerOpen(true); }
  function openEdit(c: CampaignRow): void { setSelected(c); setDrawerOpen(true); }
  function closeDrawer(): void         { setDrawerOpen(false); setSelected(null); }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text leading-none">
              Tratos
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-sp-admin-muted">
              <span><b className="text-sp-admin-text">{kpis.total}</b> total</span>
              <span className="opacity-40">•</span>
              <span><b className="text-emerald-600">{kpis.activos}</b> activos</span>
              <span className="opacity-40">•</span>
              <span><b className="text-sp-admin-text">{kpis.finalizados}</b> finalizados</span>
              <span className="opacity-40">•</span>
              <span><b className="text-sp-admin-text">{EUR.format(kpis.revenueBruto)}</b> revenue</span>
              <span className="opacity-40">•</span>
              <span><b className="text-amber-600">{EUR.format(kpis.pendienteCobro)}</b> pdte. cobro</span>
              <span className="opacity-40">•</span>
              <span><b className="text-red-500">{EUR.format(kpis.pendienteTalent)}</b> pdte. talent</span>
              <span className="opacity-40">•</span>
              <span><b className="text-sp-admin-text">{EUR.format(kpis.margenTotal)}</b> margen total</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:bg-sp-admin-accent/90 active:scale-95 transition-all shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Nuevo trato
        </button>
      </div>

      {/* ── KPIs fila 1 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <KpiCard label="Tratos"         value={kpis.total}                   accent="#f5632a" />
        <KpiCard label="Activos"        value={kpis.activos}                 accent="#16a34a" />
        <KpiCard label="En negociación" value={kpis.negociacion}             accent="#f59e0b" />
        <KpiCard label="Finalizados"    value={kpis.finalizados}             accent="#5b9bd5" />
        <KpiCard label="Revenue total"  value={EUR.format(kpis.revenueBruto)} accent="#8b3aad" />
        <KpiCard
          label="Margen total"
          value={EUR.format(kpis.margenTotal)}
          accent="#16a34a"
          {...(kpis.revenueBruto > 0 ? { sub: `${((kpis.margenTotal / kpis.revenueBruto) * 100).toFixed(1)}% sobre revenue` } : {})}
        />
      </div>

      {/* ── KPIs fila 2 (financieros) ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <KpiCard
          label="Pendiente de cobro (marca)"
          value={EUR.format(kpis.pendienteCobro)}
          accent="#f59e0b"
          sub="Tratos sin marcar como pagados"
        />
        <KpiCard
          label="Pendiente de pago (talento)"
          value={EUR.format(kpis.pendienteTalent)}
          accent="#ef4444"
          sub="Importe a transferir a los creadores"
        />
      </div>

      {/* ── Filtros ───────────────────────────────────────────────── */}
      <CampaignFilters
        filters={filters}
        onChange={setFilters}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
      />

      {/* Contador */}
      <div className="text-[11px] text-sp-admin-muted -mt-2">
        {filtered.length} {filtered.length === 1 ? 'trato' : 'tratos'}
        {filtered.length !== visible && ` de ${visible}`}
      </div>

      {/* ── Tabla ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <EmptyState
            variant={isActive(filters) ? 'no-results' : 'no-data'}
            title={isActive(filters) ? 'Sin resultados' : 'No hay tratos'}
            description={
              isActive(filters)
                ? 'Prueba a cambiar los filtros.'
                : 'Crea tu primer trato con el botón de arriba.'
            }
            action={
              !isActive(filters) ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  + Nuevo trato
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
                {[
                  'Trato', 'Marca · Influencer', 'Estado', 'Sector', 'GEO',
                  'Pago marca', 'Pago talent', 'Comisión', '% Margen',
                  'Cobro', 'Pago talent', 'Responsable', '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-3 text-[10px] font-semibold text-sp-admin-muted uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const { tone, variant } = STATUS_TONE[c.status];
                const derived = computeCampaignDerived({
                  amountBrand:  Number(c.amountBrand  ?? 0),
                  amountTalent: Number(c.amountTalent ?? 0),
                });
                const isArchived  = c.archivedAt !== null;
                const brandBadge  = brandPayBadge(c);
                const talentBadge = talentPayBadge(c);
                const marginNeg   = derived.commissionAmount < 0;

                return (
                  <tr
                    key={c.id}
                    className={[
                      'border-b border-sp-admin-border/50 last:border-0 transition-colors',
                      isArchived ? 'opacity-50 hover:opacity-70 hover:bg-sp-admin-hover' : 'hover:bg-sp-admin-hover',
                    ].join(' ')}
                  >
                    {/* Trato */}
                    <td className="px-4 py-3 whitespace-nowrap max-w-[200px]">
                      <Link
                        href={`/admin/campanas/${c.id}`}
                        className="font-semibold text-[13px] text-sp-admin-text hover:text-sp-admin-accent transition-colors truncate block"
                        title={c.name}
                      >
                        {c.name}
                        {isArchived && (
                          <span className="ml-1.5 text-[10px] text-sp-admin-muted font-normal">(archivado)</span>
                        )}
                      </Link>
                    </td>

                    {/* Marca · Influencer */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-[12px] leading-tight">
                        <span className="font-medium text-sp-admin-text">{brandMap.get(c.brandId) ?? '—'}</span>
                        <span className="mx-1 text-sp-admin-muted/40">·</span>
                        <span className="text-sp-admin-muted">{talentMap.get(c.talentId) ?? '—'}</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StateBadge tone={tone} {...(variant !== undefined ? { variant } : {})}>
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </StateBadge>
                    </td>

                    {/* Sector */}
                    <td className="px-4 py-3 text-[11px] text-sp-admin-muted whitespace-nowrap">
                      {c.sector ?? '—'}
                    </td>

                    {/* GEO */}
                    <td className="px-4 py-3 text-[11px] text-sp-admin-muted whitespace-nowrap">
                      {c.geo ?? '—'}
                    </td>

                    {/* Pago marca */}
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[13px] font-semibold text-sp-admin-text">
                      {fmtCurrency(c.amountBrand ?? 0, c.currency ?? 'EUR')}
                    </td>

                    {/* Pago talent */}
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[13px] text-sp-admin-text">
                      {fmtCurrency(c.amountTalent ?? 0, c.currency ?? 'EUR')}
                    </td>

                    {/* Comisión */}
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[13px] font-semibold"
                      style={{ color: marginNeg ? '#ef4444' : '#16a34a' }}>
                      {fmtCurrency(derived.commissionAmount, c.currency ?? 'EUR')}
                    </td>

                    {/* % Margen */}
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[12px] font-bold"
                      style={{ color: marginNeg ? '#ef4444' : '#16a34a' }}>
                      {derived.commissionPct.toFixed(1)}%
                    </td>

                    {/* Cobro marca */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PayBadge {...brandBadge} />
                    </td>

                    {/* Pago talento */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PayBadge {...talentBadge} />
                    </td>

                    {/* Responsable */}
                    <td className="px-4 py-3 text-[11px] text-sp-admin-muted whitespace-nowrap">
                      {c.responsibleUserId ? (staffMap.get(c.responsibleUserId) ?? '—') : '—'}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/campanas/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-sp-admin-accent hover:underline"
                        >
                          Ver
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                          className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Drawer ────────────────────────────────────────────────── */}
      <CampaignDrawer
        campaign={selected}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
        contactsByBrand={contactsByBrand}
        isManager={isManager}
      />
    </div>
  );
}
