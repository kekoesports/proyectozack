'use client';

import Link from 'next/link';
import { toEUR, fmtCurrency, USD_EUR_RATE } from '@/lib/currency';
import { useMemo, useState } from 'react';
import { BrandRankingTable }         from './BrandRankingTable';
import { TalentRankingTable }         from './TalentRankingTable';
import { CampaignsRevenueTable }      from './CampaignsRevenueTable';
import { AnalyticsRevenueChart }      from './AnalyticsRevenueChart';
import { AnalyticsPipelineSection }   from './AnalyticsPipelineSection';
import { AnalyticsPendingSection }    from './AnalyticsPendingSection';
import { CodeClicksSection }          from './CodeClicksSection';
import { GiveawayEventsSection }      from './GiveawayEventsSection';
import { PostEventsSection }          from './PostEventsSection';
import { DashboardAlerts }            from '@/features/admin/_shared/components/dashboard/DashboardAlerts';
import type { CampaignStatus, CampaignWithRelations, InvoiceWithRelations } from '@/types';
import type { DashboardAlert, AlertSummary } from '@/lib/queries/alerts';
import type { CodeClickRow } from '@/lib/queries/codeAnalytics';
import type { GiveawayClickRow, GiveawayHubViewRow } from '@/lib/queries/giveawayAnalytics';
import type { PostTopViewRow, PostViewsByDayRow } from '@/lib/queries/postAnalytics';

// ── Tipos ─────────────────────────────────────────────────────────────

type BrandOption  = { readonly id: number; readonly name: string };
type TalentOption = { readonly id: number; readonly name: string };

type Props = {
  readonly campaigns:    readonly CampaignWithRelations[];
  readonly invoices:     readonly InvoiceWithRelations[];
  readonly brands?:       readonly BrandOption[];
  readonly talents?:      readonly TalentOption[];
  readonly alerts?:       readonly DashboardAlert[];
  readonly alertSummary?: AlertSummary;
  readonly codeClicks?:      readonly CodeClickRow[];
  readonly giveawayClicks?:  readonly GiveawayClickRow[];
  readonly giveawayViews?:   readonly GiveawayHubViewRow[];
  readonly topPosts?:        readonly PostTopViewRow[];
  readonly postViewsByDay?:  readonly PostViewsByDayRow[];
};

// ── Formateadores ─────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function pct(part: number, total: number): string | null {
  if (total === 0) return null;
  return `${Math.round((part / total) * 100)}%`;
}
function sumField(arr: readonly { totalAmount: string | number; currency?: string }[]): number {
  return arr.reduce((s, i) => s + toEUR(i.totalAmount ?? 0, i.currency ?? 'EUR'), 0);
}
function currencyBreakdown(arr: readonly { totalAmount: string | number; currency?: string }[]): string | undefined {
  let eur = 0, usd = 0;
  for (const i of arr) {
    if ((i.currency ?? 'EUR') === 'USD') usd += Number(i.totalAmount ?? 0);
    else eur += Number(i.totalAmount ?? 0);
  }
  if (usd === 0) return undefined;
  if (eur === 0) return `${fmtCurrency(usd, 'USD')} ≈ ${fmt(usd * USD_EUR_RATE)}`;
  return `${fmt(eur)} + ${fmtCurrency(usd, 'USD')} (≈${fmt(usd * USD_EUR_RATE)})`;
}

// ── Constantes canónicas de estados pendientes ────────────────────────

const PENDING_INV = ['pendiente', 'emitida', 'no_cobrada', 'no_cobrado', 'parcial', 'vencida'];
const PENDING_EXP = ['pendiente', 'emitida', 'no_pagada',  'no_pagado',  'parcial', 'vencida'];

// ── Rango de fechas ───────────────────────────────────────────────────

type DatePreset = 'month' | '30d' | 'quarter' | 'year' | 'all';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'month',   label: 'Este mes'       },
  { value: '30d',     label: 'Últimos 30 días' },
  { value: 'quarter', label: 'Este trimestre'  },
  { value: 'year',    label: 'Este año'        },
  { value: 'all',     label: 'Todo'            },
];

function getDateRange(preset: DatePreset): { from: string; to: string } | null {
  if (preset === 'all') return null;
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  if (preset === '30d')     return { from: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), to: today };
  if (preset === 'month')   return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: today };
  if (preset === 'quarter') return { from: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10), to: today };
  return { from: `${now.getFullYear()}-01-01`, to: today };
}

// ── KPI Card ──────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent, dimmed,
}: {
  readonly label:   string;
  readonly value:   string;
  readonly sub?:    string | undefined;
  readonly accent:  string;
  readonly dimmed?: boolean;
}): React.ReactElement {
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

function SectionHeader({ title, sub, href }: { title: string; sub?: string; href?: string }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[13px] font-bold text-sp-admin-text">{title}</h2>
        {sub && <span className="text-[11px] text-sp-admin-muted">{sub}</span>}
      </div>
      {href && (
        <Link href={href} className="text-[11px] text-sp-admin-accent hover:underline shrink-0">
          Ver detalles →
        </Link>
      )}
    </div>
  );
}

const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

const CAMPAIGN_STATUSES: { value: CampaignStatus | ''; label: string }[] = [
  { value: '',               label: 'Todos los estados'  },
  { value: 'propuesta',      label: 'Propuesta'          },
  { value: 'negociacion',    label: 'Negociación'        },
  { value: 'aprobada',       label: 'Aprobada'           },
  { value: 'activa',         label: 'Activa'             },
  { value: 'completada',     label: 'Completada'         },
  { value: 'cancelada',      label: 'Cancelada'          },
  { value: 'pendiente_pago', label: 'Pendiente pago'     },
  { value: 'pagada',         label: 'Pagada'             },
];

// ── Dashboard principal ───────────────────────────────────────────────

export function AnalyticsDashboard({
  campaigns, invoices, brands = [], talents = [],
  alerts = [], alertSummary, codeClicks = [], giveawayClicks = [], giveawayViews = [],
  topPosts = [], postViewsByDay = [],
}: Props): React.ReactElement {
  const [datePreset, setDatePreset] = useState<DatePreset>('year');
  const [status,     setStatus]     = useState<CampaignStatus | ''>('');
  const [sector,     setSector]     = useState('');
  const [geo,        setGeo]        = useState('');
  const [brandId,    setBrandId]    = useState('');
  const [talentId,   setTalentId]   = useState('');
  const [search,     setSearch]     = useState('');

  // Listas dinámicas de sector/geo desde campañas
  const sectors = useMemo(() => {
    const s = new Set<string>();
    campaigns.forEach((c) => { if (c.sector) s.add(c.sector); });
    return [...s].sort();
  }, [campaigns]);

  const geos = useMemo(() => {
    const g = new Set<string>();
    campaigns.forEach((c) => { if (c.geo) g.add(c.geo); });
    return [...g].sort();
  }, [campaigns]);

  // Rango activo
  const range = useMemo(() => getDateRange(datePreset), [datePreset]);

  // Campañas filtradas
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];
    if (range) {
      result = result.filter((c) => {
        const d = new Date(c.createdAt).toISOString().slice(0, 10);
        return d >= range.from && d <= range.to;
      });
    }
    if (status)   result = result.filter((c) => c.status === status);
    if (sector)   result = result.filter((c) => c.sector === sector);
    if (geo)      result = result.filter((c) => c.geo    === geo);
    if (brandId)  result = result.filter((c) => String(c.brandId)  === brandId);
    if (talentId) result = result.filter((c) => String(c.talentId) === talentId);
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.brandName  ?? '').toLowerCase().includes(q) ||
      (c.talentName ?? '').toLowerCase().includes(q),
    );
    return result;
  }, [campaigns, range, status, sector, geo, brandId, talentId, search]);

  // Invoices filtradas (excluye anuladas + aplica rango de fechas)
  const filteredInvoices = useMemo(() => {
    let result = invoices.filter((i) => i.status !== 'anulada');
    if (range) result = result.filter((i) => i.issueDate >= range.from && i.issueDate <= range.to);
    if (brandId)  result = result.filter((i) => String(i.brandId  ?? '') === brandId);
    if (talentId) result = result.filter((i) => String(i.talentId ?? '') === talentId);
    return result;
  }, [invoices, range, brandId, talentId]);

  // ── KPIs financieros ──────────────────────────────────────────────
  const hasInvoices = invoices.length > 0;

  const kpis = useMemo(() => {
    if (hasInvoices) {
      const inc = filteredInvoices.filter((i) => i.kind === 'income');
      const exp = filteredInvoices.filter((i) => i.kind === 'expense');

      const revTotal   = sumField(inc);
      const revCobrado = sumField(inc.filter((i) => i.status === 'cobrada' || i.status === 'pagada'));
      const revPdte    = sumField(inc.filter((i) => PENDING_INV.includes(i.status)));
      const expTotal   = sumField(exp);
      const expPagado  = sumField(exp.filter((i) => i.status === 'cobrada' || i.status === 'pagada'));
      const expPdte    = sumField(exp.filter((i) => PENDING_EXP.includes(i.status)));
      const margin     = revTotal - expTotal;
      const revBreakdown = currencyBreakdown(inc);
      const expBreakdown = currencyBreakdown(exp);
      return { revTotal, revCobrado, revPdte, expTotal, expPagado, expPdte, margin, revBreakdown, expBreakdown };
    }

    // Fallback a campañas — convierte USD a EUR
    const valid = filteredCampaigns.filter((c) => c.status !== 'cancelada');
    const asInvoice = (c: typeof valid[number], field: 'amountBrand' | 'amountTalent') =>
      ({ totalAmount: c[field] ?? 0, currency: c.currency ?? 'EUR' });

    const revTotal   = valid.reduce((s, c) => s + toEUR(c.amountBrand  ?? 0, c.currency ?? 'EUR'), 0);
    const revCobrado = valid.filter((c) => c.brandPaid  !== 'no').reduce((s, c) => s + toEUR(c.amountBrand  ?? 0, c.currency ?? 'EUR'), 0);
    const revPdte    = valid.filter((c) => c.brandPaid  === 'no').reduce((s, c) => s + toEUR(c.amountBrand  ?? 0, c.currency ?? 'EUR'), 0);
    const expTotal   = valid.reduce((s, c) => s + toEUR(c.amountTalent ?? 0, c.currency ?? 'EUR'), 0);
    const expPagado  = valid.filter((c) => c.talentPaid !== 'no').reduce((s, c) => s + toEUR(c.amountTalent ?? 0, c.currency ?? 'EUR'), 0);
    const expPdte    = valid.filter((c) => c.talentPaid === 'no').reduce((s, c) => s + toEUR(c.amountTalent ?? 0, c.currency ?? 'EUR'), 0);
    const margin     = revTotal - expTotal;
    const revBreakdown = currencyBreakdown(valid.map((c) => asInvoice(c, 'amountBrand')));
    const expBreakdown = currencyBreakdown(valid.map((c) => asInvoice(c, 'amountTalent')));
    return { revTotal, revCobrado, revPdte, expTotal, expPagado, expPdte, margin, revBreakdown, expBreakdown };
  }, [hasInvoices, filteredInvoices, filteredCampaigns]);

  const tratosActivos     = filteredCampaigns.filter((c) => c.status === 'activa').length;
  const tratosFinalizados = filteredCampaigns.filter((c) => c.status === 'completada' || c.status === 'pagada').length;
  const margenPct         = pct(kpis.margin, kpis.revTotal);

  const activeFilters = [status, sector, geo, brandId, talentId, search].filter(Boolean).length;

  function clearFilters(): void {
    setStatus(''); setSector(''); setGeo('');
    setBrandId(''); setTalentId(''); setSearch('');
  }

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Analítica</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            {filteredCampaigns.length} tratos · {tratosActivos} activos · {tratosFinalizados} finalizados
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasInvoices ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              KPIs de facturación real
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              KPIs estimados desde tratos
            </span>
          )}
          <Link href="/admin/pl" className="text-[11px] font-semibold text-sp-admin-accent hover:underline">
            Ver P&L completo →
          </Link>
        </div>
      </div>

      {/* ── Navegación rápida ──────────────────────────────────────── */}
      <nav aria-label="Secciones de analítica" className="flex flex-wrap gap-1.5">
        {[
          { href: '#analitica-financiero', label: 'Resumen financiero' },
          { href: '#analitica-grafica',    label: 'Evolución mensual'   },
          { href: '#analitica-pipeline',   label: 'Pipeline'             },
          { href: '#analitica-pendientes', label: 'Pendientes'           },
          { href: '#analitica-marcas',     label: 'Ranking marcas'       },
          { href: '#analitica-talentos',   label: 'Ranking talentos'     },
          { href: '#analitica-codigos',    label: 'Clicks en códigos'    },
          { href: '#analitica-editorial',  label: 'Editorial'             },
          { href: '#analitica-alertas',    label: 'Alertas críticas'     },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="inline-flex items-center h-6 px-2.5 rounded-full border border-sp-admin-border bg-sp-admin-card text-[10px] font-semibold text-sp-admin-muted hover:border-sp-admin-accent hover:text-sp-admin-accent transition-colors"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* ── Banner de estado vacío (sin invoices) ─────────────────── */}
      {!hasInvoices && campaigns.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-amber-500 text-base shrink-0 mt-0.5" aria-hidden>⚡</span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-amber-800">
              Los KPIs se están calculando desde importes estimados de tratos, no desde facturación real.
            </p>
            <p className="text-[11px] text-amber-700/80 mt-0.5">
              Para ver métricas financieras precisas,{' '}
              <Link href="/admin/facturacion" className="underline font-semibold">registra movimientos en Facturación</Link>
              {' '}o{' '}
              <Link href="/admin/campanas" className="underline font-semibold">crea movimientos desde cada trato</Link>.
            </p>
          </div>
        </div>
      )}
      {campaigns.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-sp-admin-border bg-sp-admin-card px-4 py-6 text-center justify-center">
          <div>
            <p className="text-[14px] font-semibold text-sp-admin-text">Sin tratos registrados</p>
            <p className="text-[12px] text-sp-admin-muted mt-1">
              <Link href="/admin/campanas" className="text-sp-admin-accent hover:underline">Crea tu primer trato</Link>
              {' '}para empezar a ver métricas de negocio.
            </p>
          </div>
        </div>
      )}

      {/* ── Filtros globales ───────────────────────────────────────── */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Fecha */}
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} className={INPUT_SM}>
            {DATE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {/* Estado de trato */}
          <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus | '')} className={INPUT_SM}>
            {CAMPAIGN_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* Sector */}
          {sectors.length > 0 && (
            <select value={sector} onChange={(e) => setSector(e.target.value)} className={INPUT_SM}>
              <option value="">Todos los sectores</option>
              {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {/* GEO */}
          {geos.length > 0 && (
            <select value={geo} onChange={(e) => setGeo(e.target.value)} className={INPUT_SM}>
              <option value="">Todos los GEO</option>
              {geos.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Marca */}
          {brands.length > 0 && (
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={INPUT_SM}>
              <option value="">Todas las marcas</option>
              {brands.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          )}
          {/* Talento */}
          {talents.length > 0 && (
            <select value={talentId} onChange={(e) => setTalentId(e.target.value)} className={INPUT_SM}>
              <option value="">Todos los talentos</option>
              {talents.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
            </select>
          )}
          {/* Búsqueda */}
          <input
            type="search"
            placeholder="Buscar trato, marca, talento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT_SM} flex-1 min-w-[180px]`}
          />
          {activeFilters > 0 && (
            <button type="button" onClick={clearFilters}
              className="text-[11px] text-sp-admin-accent hover:underline whitespace-nowrap">
              Limpiar ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* ── 1. RESUMEN FINANCIERO ────────────────────────────────── */}
      <div id="analitica-financiero">
        <SectionHeader
          title="Resumen financiero"
          sub={hasInvoices ? 'Desde facturación real · excluye anulados' : 'Estimado desde importes de tratos'}
          href="/admin/facturacion"
        />
        {/* Fila 1 — Revenue */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
          <KpiCard label="Revenue total"     value={fmt(kpis.revTotal)}   accent="#16a34a"
            sub={kpis.revBreakdown ?? `${filteredCampaigns.filter((c) => c.status !== 'cancelada').length} tratos`} />
          <KpiCard label="Revenue cobrado"   value={fmt(kpis.revCobrado)} accent="#059669"
            sub={pct(kpis.revCobrado, kpis.revTotal) ?? undefined} dimmed={kpis.revCobrado === 0} />
          <KpiCard label="Revenue pendiente" value={fmt(kpis.revPdte)}    accent="#f59e0b"
            sub={kpis.revPdte > 0 ? 'Por cobrar' : undefined} dimmed={kpis.revPdte === 0} />
          <KpiCard label="Margen neto"       value={fmt(kpis.margin)}     accent={kpis.margin >= 0 ? '#2563eb' : '#dc2626'}
            sub={margenPct ?? undefined} />
          <KpiCard label="Margen %"          value={margenPct ?? '—'}     accent={kpis.margin >= 0 ? '#3b82f6' : '#ef4444'}
            sub={kpis.revTotal > 0 ? `de ${fmt(kpis.revTotal)}` : undefined} dimmed={kpis.revTotal === 0} />
        </div>
        {/* Fila 2 — Gastos + Tratos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <KpiCard label="Gastos totales"     value={fmt(kpis.expTotal)}   accent="#f59e0b"
            sub={kpis.expBreakdown} />
          <KpiCard label="Gastos pagados"     value={fmt(kpis.expPagado)}  accent="#d97706"
            sub={pct(kpis.expPagado, kpis.expTotal) ?? undefined} dimmed={kpis.expPagado === 0} />
          <KpiCard label="Gastos pendientes"  value={fmt(kpis.expPdte)}    accent="#e03070"
            sub={kpis.expPdte > 0 ? 'Por pagar' : undefined} dimmed={kpis.expPdte === 0} />
          <KpiCard label="Tratos activos"     value={String(tratosActivos)}
            accent={tratosActivos > 0 ? '#f5632a' : '#72728a'} />
          <KpiCard label="Tratos finalizados" value={String(tratosFinalizados)}
            accent="#8b3aad" dimmed={tratosFinalizados === 0} />
        </div>
      </div>

      {/* ── 2. GRÁFICA MENSUAL ───────────────────────────────────── */}
      <div id="analitica-grafica">
        <SectionHeader title="Evolución mensual" sub="Ingresos · Gastos · Margen" href="/admin/pl" />
        <AnalyticsRevenueChart invoices={filteredInvoices} months={12} />
      </div>

      {/* ── 3. PIPELINE DE TRATOS ────────────────────────────────── */}
      <div id="analitica-pipeline">
        <SectionHeader title="Pipeline de tratos" sub="Click en estado para filtrar" href="/admin/campanas" />
        <AnalyticsPipelineSection campaigns={filteredCampaigns} />
      </div>

      {/* ── 4. COBROS Y PAGOS PENDIENTES ─────────────────────────── */}
      <div id="analitica-pendientes">
        <SectionHeader title="Cobros y pagos pendientes" sub="Ordenados por urgencia" href="/admin/facturacion" />
        <AnalyticsPendingSection invoices={filteredInvoices} campaigns={filteredCampaigns} />
      </div>

      {/* ── 5. RANKING MARCAS ────────────────────────────────────── */}
      <div id="analitica-marcas">
        <SectionHeader title="Ranking de marcas" sub="Por revenue generado · click para abrir perfil" href="/admin/brands" />
        <BrandRankingTable campaigns={filteredCampaigns} invoices={filteredInvoices} />
      </div>

      {/* ── 6. RANKING TALENTOS ──────────────────────────────────── */}
      <div id="analitica-talentos">
        <SectionHeader title="Ranking de talentos" sub="Por revenue generado · click para abrir perfil" href="/admin/talents" />
        <TalentRankingTable campaigns={filteredCampaigns} invoices={filteredInvoices} />
      </div>

      {/* ── 7. CLICKS EN CÓDIGOS ─────────────────────────────────── */}
      <CodeClicksSection rows={codeClicks} />

      {/* ── 8. SORTEOS — VISTAS Y CLICKS ────────────────────────── */}
      <GiveawayEventsSection clicks={giveawayClicks} views={giveawayViews} />

      {/* ── 9. EDITORIAL — VISITAS A ARTÍCULOS ───────────────────── */}
      <PostEventsSection topPosts={topPosts} viewsByDay={postViewsByDay} />

      {/* ── 10. DETALLE TRATOS ───────────────────────────────────── */}
      <details className="group">
        <summary className="cursor-pointer select-none flex items-center gap-2 text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text mb-3">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            className="group-open:rotate-90 transition-transform" aria-hidden>
            <path d="M4 2l4 4-4 4"/>
          </svg>
          Detalle de tratos ({filteredCampaigns.length})
        </summary>
        <CampaignsRevenueTable campaigns={filteredCampaigns} />
      </details>

      {/* ── 11. ALERTAS CRÍTICAS ─────────────────────────────────── */}
      <div id="analitica-alertas">
        <SectionHeader
          title="Alertas críticas"
          sub="Operativo · Finanzas · Tratos"
          href="/admin"
        />
        {alertSummary ? (
          <DashboardAlerts alerts={alerts} summary={alertSummary} />
        ) : (
          <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-6 text-center">
            <p className="text-[12px] text-sp-admin-muted">Sin alertas activas.</p>
          </div>
        )}
      </div>

    </div>
  );
}
