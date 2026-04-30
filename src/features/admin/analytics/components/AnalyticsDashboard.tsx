'use client';

import { useMemo, useState } from 'react';
import { BrandRankingTable } from './BrandRankingTable';
import { TalentRankingTable } from './TalentRankingTable';
import { CampaignsRevenueTable } from './CampaignsRevenueTable';
import type { CampaignWithRelations, CampaignStatus, InvoiceWithRelations } from '@/types';

type Props = {
  readonly campaigns: readonly CampaignWithRelations[];
  readonly invoices:  readonly InvoiceWithRelations[];
};

// ── Formateadores ─────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function pct(part: number, total: number): string | null {
  if (total === 0) return null;
  return `${Math.round((part / total) * 100)}%`;
}
function sumField(arr: readonly { totalAmount: string | number }[]): number {
  return arr.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
}

// ── Rango de fechas ───────────────────────────────────────────────────

type DatePreset = 'month' | '30d' | 'quarter' | 'year' | 'all';
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'month',   label: 'Este mes' },
  { value: '30d',     label: 'Últimos 30 días' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year',    label: 'Este año' },
  { value: 'all',     label: 'Todo' },
];

function getDateRange(preset: DatePreset): { from: string; to: string } | null {
  if (preset === 'all') return null;
  const now  = new Date();
  const today = now.toISOString().slice(0, 10);
  if (preset === '30d') {
    return { from: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), to: today };
  }
  if (preset === 'month') {
    return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: today };
  }
  if (preset === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return { from: new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10), to: today };
  }
  return { from: `${now.getFullYear()}-01-01`, to: today };
}

// ── KPI Card ──────────────────────────────────────────────────────────

type KpiCardProps = {
  readonly label:    string;
  readonly value:    string;
  readonly sub?:     string | undefined;
  readonly accent:   string;
  readonly dimmed?:  boolean | undefined;
};

function KpiCard({ label, value, sub, accent, dimmed }: KpiCardProps): React.ReactElement {
  return (
    <div className={`rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden ${dimmed ? 'opacity-50' : ''}`}>
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3.5">
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted leading-none truncate">{label}</p>
        <p className="text-[17px] font-bold tabular-nums mt-1.5 leading-none" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[9px] font-medium mt-1 text-sp-admin-muted/70 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <h2 className="text-[13px] font-bold text-sp-admin-text">{title}</h2>
      {sub && <span className="text-[11px] text-sp-admin-muted">{sub}</span>}
    </div>
  );
}

const PENDING_INV: string[] = ['no_cobrado', 'pendiente', 'emitida'];
const PENDING_EXP: string[] = ['no_pagado',  'pendiente', 'emitida'];

const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

const STATUSES: { value: CampaignStatus | ''; label: string }[] = [
  { value: '',            label: 'Todos los estados' },
  { value: 'propuesta',   label: 'Propuesta' },
  { value: 'negociacion', label: 'Negociación' },
  { value: 'aprobada',    label: 'Aprobada' },
  { value: 'activa',      label: 'Activa' },
  { value: 'completada',  label: 'Completada' },
  { value: 'cancelada',   label: 'Cancelada' },
  { value: 'pendiente_pago', label: 'Pendiente pago' },
  { value: 'pagada',      label: 'Pagada' },
];

// ── Dashboard ─────────────────────────────────────────────────────────

export function AnalyticsDashboard({ campaigns, invoices }: Props): React.ReactElement {
  const [datePreset, setDatePreset] = useState<DatePreset>('year');
  const [status,     setStatus]     = useState<CampaignStatus | ''>('');
  const [sector,     setSector]     = useState('');
  const [search,     setSearch]     = useState('');

  const sectors = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => { if (c.sector) set.add(c.sector); });
    return [...set].sort();
  }, [campaigns]);

  // ── Filtramos campañas e invoices por el mismo rango ──────────────
  const range = useMemo(() => getDateRange(datePreset), [datePreset]);

  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];
    if (range) {
      result = result.filter((c) => {
        const d = new Date(c.createdAt).toISOString().slice(0, 10);
        return d >= range.from && d <= range.to;
      });
    }
    if (status) result = result.filter((c) => c.status === status);
    if (sector) result = result.filter((c) => c.sector === sector);
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.brandName  ?? '').toLowerCase().includes(q) ||
      (c.talentName ?? '').toLowerCase().includes(q),
    );
    return result;
  }, [campaigns, range, status, sector, search]);

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter((i) => i.status !== 'anulada');
    if (range) result = result.filter((i) => i.issueDate >= range.from && i.issueDate <= range.to);
    return result;
  }, [invoices, range]);

  // ── KPIs financieros ──────────────────────────────────────────────
  const hasInvoices = invoices.length > 0;

  const kpis = useMemo(() => {
    if (hasInvoices) {
      // Fuente primaria: invoices
      const inc = filteredInvoices.filter((i) => i.kind === 'income');
      const exp = filteredInvoices.filter((i) => i.kind === 'expense');
      const revTotal   = sumField(inc);
      const revCobrado = sumField(inc.filter((i) => i.status === 'cobrada'));
      const revPdte    = sumField(inc.filter((i) => PENDING_INV.includes(i.status)));
      const expTotal   = sumField(exp);
      const expPagado  = sumField(exp.filter((i) => i.status === 'cobrada'));
      const expPdte    = sumField(exp.filter((i) => PENDING_EXP.includes(i.status)));
      const margin     = revTotal - expTotal;
      return { revTotal, revCobrado, revPdte, expTotal, expPagado, expPdte, margin };
    }
    // Fallback: campañas
    const notCancelled = filteredCampaigns.filter((c) => c.status !== 'cancelada');
    const revTotal   = notCancelled.reduce((s, c) => s + Number(c.amountBrand  ?? 0), 0);
    const revCobrado = notCancelled.filter((c) => c.brandPaid !== 'no').reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
    const revPdte    = notCancelled.filter((c) => c.brandPaid === 'no').reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
    const expTotal   = notCancelled.reduce((s, c) => s + Number(c.amountTalent ?? 0), 0);
    const expPagado  = notCancelled.filter((c) => c.talentPaid !== 'no').reduce((s, c) => s + Number(c.amountTalent ?? 0), 0);
    const expPdte    = notCancelled.filter((c) => c.talentPaid === 'no').reduce((s, c) => s + Number(c.amountTalent ?? 0), 0);
    const margin     = revTotal - expTotal;
    return { revTotal, revCobrado, revPdte, expTotal, expPagado, expPdte, margin };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInvoices, filteredInvoices, filteredCampaigns]); // PENDING_INV/EXP son constantes de módulo

  const tratosActivos     = filteredCampaigns.filter((c) => c.status === 'activa').length;
  const tratosFinalizados = filteredCampaigns.filter((c) => c.status === 'completada').length;
  const margenPct         = pct(kpis.margin, kpis.revTotal);
  const activeFilters     = [status, sector, search].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Analítica</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            {filteredCampaigns.length} tratos · {tratosActivos} activos
            {!hasInvoices && <span className="ml-2 text-amber-600">· KPIs basados en importes de tratos (sin facturación conectada)</span>}
          </p>
        </div>
        {hasInvoices && (
          <span className="text-[10px] text-emerald-600 flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            KPIs de facturación real
          </span>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} className={INPUT_SM}>
          {DATE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus | '')} className={INPUT_SM}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {sectors.length > 0 && (
          <select value={sector} onChange={(e) => setSector(e.target.value)} className={INPUT_SM}>
            <option value="">Todos los sectores</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <input
          type="search"
          placeholder="Buscar trato, marca, talento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT_SM} min-w-[200px] flex-1`}
        />
        {activeFilters > 0 && (
          <button type="button" onClick={() => { setStatus(''); setSector(''); setSearch(''); }}
            className="text-[11px] text-sp-admin-accent hover:underline">
            Limpiar ({activeFilters})
          </button>
        )}
      </div>

      {/* ── 1. RESUMEN FINANCIERO ── */}
      <div>
        <SectionHeader title="Resumen financiero" sub={hasInvoices ? 'Desde facturación' : 'Desde importes de tratos'} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
          <KpiCard label="Revenue total"     value={fmt(kpis.revTotal)}   sub={`${filteredCampaigns.filter(c => c.status !== 'cancelada').length} tratos`} accent="#16a34a" />
          <KpiCard label="Revenue cobrado"   value={fmt(kpis.revCobrado)} sub={pct(kpis.revCobrado, kpis.revTotal) ?? undefined} accent="#059669" dimmed={kpis.revCobrado === 0} />
          <KpiCard label="Revenue pendiente" value={fmt(kpis.revPdte)}    sub={kpis.revPdte > 0 ? 'Por cobrar' : undefined} accent="#f59e0b" dimmed={kpis.revPdte === 0} />
          <KpiCard label="Margen neto"       value={fmt(kpis.margin)}     sub={margenPct ?? undefined} accent={kpis.margin >= 0 ? '#2563eb' : '#dc2626'} />
          <KpiCard label="Margen %"          value={margenPct ?? '—'}     sub={kpis.revTotal > 0 ? `de ${fmt(kpis.revTotal)}` : undefined} accent={kpis.margin >= 0 ? '#3b82f6' : '#ef4444'} dimmed={kpis.revTotal === 0} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <KpiCard label="Gastos totales"    value={fmt(kpis.expTotal)}   accent="#f59e0b" />
          <KpiCard label="Gastos pagados"    value={fmt(kpis.expPagado)}  sub={pct(kpis.expPagado, kpis.expTotal) ?? undefined} accent="#d97706" dimmed={kpis.expPagado === 0} />
          <KpiCard label="Gastos pendientes" value={fmt(kpis.expPdte)}    sub={kpis.expPdte > 0 ? 'Por pagar' : undefined} accent="#e03070" dimmed={kpis.expPdte === 0} />
          <KpiCard label="Tratos activos"    value={String(tratosActivos)}    accent={tratosActivos > 0 ? '#f5632a' : '#72728a'} />
          <KpiCard label="Tratos finalizados" value={String(tratosFinalizados)} accent="#8b3aad" dimmed={tratosFinalizados === 0} />
        </div>
      </div>

      {/* ── 2. RANKING MARCAS ── */}
      <div>
        <SectionHeader title="Ranking de marcas" sub="Ordenado por revenue generado" />
        <BrandRankingTable campaigns={filteredCampaigns} />
      </div>

      {/* ── 3. RANKING TALENTOS ── */}
      <div>
        <SectionHeader title="Ranking de talentos" sub="Ordenado por revenue generado" />
        <TalentRankingTable campaigns={filteredCampaigns} />
      </div>

      {/* ── 4. DETALLE TRATOS ── */}
      <details>
        <summary className="cursor-pointer select-none text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text mb-3">
          Ver detalle de tratos ({filteredCampaigns.length})
        </summary>
        <CampaignsRevenueTable campaigns={filteredCampaigns} />
      </details>
    </div>
  );
}
