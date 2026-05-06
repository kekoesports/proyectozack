import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAnyRole } from '@/lib/auth-guard';
import { getCrmBrand, getBrandContacts, getCrmBrandForPermission, listBrandFollowups } from '@/lib/queries/crmBrands';
import { needsVisibilityFilter } from '@/lib/permissions';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listInvoices } from '@/lib/queries/invoices';
import { listBriefs } from '@/lib/queries/brandBriefs';
import { BrandBriefsTab } from '@/features/admin/brands/components/BrandBriefsTab';
import { BrandsTabs } from '@/features/admin/brands/components/BrandsTabs';

import type { CampaignRow } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  lead:             { label: 'Lead',            color: '#8b3aad', bg: '#8b3aad14' },
  contactado:       { label: 'Contactado',      color: '#5b9bd5', bg: '#5b9bd514' },
  en_negociacion:   { label: 'En negociación',  color: '#f59e0b', bg: '#f59e0b14' },
  propuesta_enviada:{ label: 'Propuesta env.',  color: '#f5632a', bg: '#f5632a14' },
  activa:           { label: 'Activa',           color: '#16a34a', bg: '#16a34a14' },
  inactiva:         { label: 'Inactiva',         color: '#72728a', bg: '#72728a14' },
  perdida:          { label: 'Perdida',          color: '#ef4444', bg: '#ef444414' },
  pausada:          { label: 'Pausada',          color: '#f59e0b', bg: '#f59e0b14' },
  archivada:        { label: 'Archivada',        color: '#72728a', bg: '#72728a14' },
};

const CAMPAIGN_STATUS: Record<string, { label: string; color: string }> = {
  negociacion: { label: 'Negociación', color: '#8b3aad' },
  activa:      { label: 'Activa',      color: '#16a34a' },
  pausada:     { label: 'Pausada',     color: '#f59e0b' },
  finalizada:  { label: 'Finalizada',  color: '#5b9bd5' },
  cancelada:   { label: 'Cancelada',   color: '#ef4444' },
};

function formatMoney(n: string | number | null | undefined): string {
  if (!n || Number(n) === 0) return '0 €';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n));
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = diff / 3600000;
  if (hours < 1) return 'Hace menos de 1h';
  if (hours < 24) return `Hace ${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function BrandDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const brandId = Number(id);
  if (isNaN(brandId)) notFound();

  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const isStaffRole = session.user.role === 'staff';
  const staffOpts   = isStaffRole
    ? { session: { userId: session.user.id, role: session.user.role as 'staff' } }
    : undefined;

  const [brand, contacts, followups, campaigns, invoices, briefs] = await Promise.all([
    getCrmBrand(brandId),
    getBrandContacts(brandId),
    listBrandFollowups(brandId),
    listCampaigns({ filters: { brandId }, ...staffOpts }),
    listInvoices({ brandId, ...(isStaffRole ? { staffUserId: session.user.id } : {}) }),
    listBriefs(brandId),
  ]);

  // Derived campaign summary from the list
  const campaignSummary = {
    total:          campaigns.length,
    active:         campaigns.filter((c: CampaignRow) => c.status === 'activa').length,
    totalRevenue:   campaigns.reduce((s: number, c: CampaignRow) => s + Number(c.amountBrand ?? 0), 0),
    pendingRevenue: campaigns
      .filter((c: CampaignRow) => !['cancelada', 'pagada'].includes(c.status))
      .reduce((s: number, c: CampaignRow) => s + Number(c.amountBrand ?? 0), 0),
  };

  if (!brand) notFound();

  // IDOR guard: staff solo puede ver marcas donde participa
  if (needsVisibilityFilter(session.user.role)) {
    const perm = await getCrmBrandForPermission(brandId);
    const canRead =
      perm !== undefined && (
        perm.assignedToUserId   === session.user.id ||
        perm.coAssignedToUserId === session.user.id ||
        perm.createdByUserId    === session.user.id
      );
    if (!canRead) notFound();
  }

  const statusCfg = STATUS_LABELS[brand.status] ?? { label: brand.status, color: '#72728a', bg: '#72728a1a' };

  const invoiceSummary = {
    incomeTotal: invoices.filter((i) => i.kind === 'income').reduce((s, i) => s + Number(i.totalAmount), 0),
    pendingIncome: invoices.filter((i) => i.kind === 'income' && i.status !== 'cobrada').reduce((s, i) => s + Number(i.totalAmount), 0),
  };

  const now = new Date();
  const pendingFollowups = followups.filter((f) => !f.completedAt);
  const overdueFollowups = pendingFollowups.filter((f) => new Date(f.scheduledAt) < now);

  const isAdmin = session.user.role === 'admin';

  const resumenContent = (
    <div className="space-y-4">
      {/* Breadcrumb — only inside tab */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted">
        <Link href="/admin/brands" className="hover:text-sp-admin-accent transition-colors">Marcas</Link>
        <span>›</span>
        <span className="text-sp-admin-text font-medium">{brand.name}</span>
      </div>

      {/* Header de marca */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }}
          >
            {brand.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-sp-admin-text">{brand.name}</h1>
              <span
                className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ color: statusCfg.color, background: statusCfg.bg }}
              >
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-sp-admin-muted">
              {brand.website && (
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="hover:text-sp-admin-accent transition-colors truncate max-w-[200px]">
                  {brand.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {brand.sector && <span>· {brand.sector}</span>}
              {brand.geo && <span>· {brand.geo}</span>}
              {brand.country && <span>· {brand.country}</span>}
            </div>
          </div>
        </div>
        <Link
          href={`/admin/brands`}
          className="text-[12px] font-medium text-sp-admin-muted hover:text-sp-admin-text border border-sp-admin-border rounded-lg px-3 py-1.5 hover:bg-sp-admin-hover transition-colors"
        >
          ← Volver
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Tratos totales',  value: campaignSummary.total,                 color: '#f5632a' },
          { label: 'Tratos activos',  value: campaignSummary.active,                color: '#16a34a' },
          { label: 'Revenue total',   value: formatMoney(campaignSummary.totalRevenue),   color: '#8b3aad' },
          { label: 'Pdte. de cobro',  value: formatMoney(campaignSummary.pendingRevenue), color: '#f59e0b' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: k.color }} />
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{k.label}</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 2 columnas: info + contactos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Info general */}
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Información</h2>
          </div>
          <div className="p-4 space-y-2.5">
            {[
              { label: 'Manager', value: brand.manager },
              { label: 'Tipo', value: brand.tipo },
              { label: 'Sector', value: brand.sector },
              { label: 'GEO', value: brand.geo },
              { label: 'País', value: brand.country },
            ].map((r) => r.value ? (
              <div key={r.label} className="flex justify-between gap-2">
                <span className="text-[10px] text-sp-admin-muted uppercase tracking-wide">{r.label}</span>
                <span className="text-[12px] font-medium text-sp-admin-text text-right">{r.value}</span>
              </div>
            ) : null)}
            {brand.notes && (
              <div className="pt-2 border-t border-sp-admin-border/50">
                <p className="text-[10px] text-sp-admin-muted uppercase tracking-wide mb-1">Notas</p>
                <p className="text-[12px] text-sp-admin-text leading-relaxed">{brand.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contactos */}
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Contactos</h2>
            <span className="text-[10px] text-sp-admin-muted">{contacts.length}</span>
          </div>
          <div className="divide-y divide-sp-admin-border/40">
            {contacts.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-sp-admin-muted text-center">Sin contactos</p>
            ) : contacts.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-sp-admin-text">
                      {c.name}
                      {c.isPrimary && <span className="ml-1.5 text-[8px] font-bold uppercase tracking-wide text-sp-admin-accent">· Principal</span>}
                    </p>
                    {c.role && <p className="text-[10px] text-sp-admin-muted">{c.role}</p>}
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {c.email && <p className="text-[11px] text-sp-admin-muted">✉ {c.email}</p>}
                  {c.telegram && <p className="text-[11px] text-sp-admin-muted">✈ @{c.telegram}</p>}
                  {c.phone && <p className="text-[11px] text-sp-admin-muted">📞 {c.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-ups */}
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Follow-ups</h2>
            <div className="flex items-center gap-2">
              {overdueFollowups.length > 0 && (
                <span className="text-[9px] font-bold text-red-500">{overdueFollowups.length} vencidos</span>
              )}
              <span className="text-[10px] text-sp-admin-muted">{pendingFollowups.length} pdte.</span>
            </div>
          </div>
          <div className="divide-y divide-sp-admin-border/40 max-h-64 overflow-y-auto">
            {pendingFollowups.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-sp-admin-muted text-center">Sin follow-ups pendientes</p>
            ) : pendingFollowups.map((f) => {
              const isOverdue = new Date(f.scheduledAt) < now;
              const priorityColors: Record<string, string> = { alta: '#ef4444', media: '#f59e0b', baja: '#72728a' };
              return (
                <div key={f.id} className="px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-sp-admin-text leading-snug flex-1">{f.note}</p>
                    <span
                      className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                      style={{ color: priorityColors[f.priority] ?? '#72728a', background: `${priorityColors[f.priority] ?? '#72728a'}14` }}
                    >
                      {f.priority}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-500 font-semibold' : 'text-sp-admin-muted'}`}>
                    {new Date(f.scheduledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {isOverdue && ' · VENCIDO'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tratos/Campañas */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Tratos</h2>
          <Link href="/admin/campanas" className="text-[10px] text-sp-admin-accent hover:opacity-70 transition-opacity">
            Ver todos →
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <p className="px-4 py-8 text-[12px] text-sp-admin-muted text-center">No hay tratos para esta marca</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/30">
                  {['Trato', 'Influencer', 'Estado', 'Pago marca', 'Margen', 'Cobrado'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: CampaignRow) => {
                   const margin = Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0);
                   const scfg = CAMPAIGN_STATUS[c.status] ?? { label: c.status, color: '#72728a' };
                   return (
                     <tr key={c.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                       <td className="px-4 py-2.5 text-[12px] font-medium text-sp-admin-text">{c.name}</td>
                       <td className="px-4 py-2.5 text-[12px] text-sp-admin-muted">—</td>
                       <td className="px-4 py-2.5">
                         <span className="text-[10px] font-bold uppercase" style={{ color: scfg.color }}>{scfg.label}</span>
                       </td>
                       <td className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-sp-admin-text">{formatMoney(c.amountBrand)}</td>
                       <td className="px-4 py-2.5 text-[12px] font-semibold tabular-nums" style={{ color: margin >= 0 ? '#16a34a' : '#ef4444' }}>
                         {formatMoney(String(margin))}
                       </td>
                       <td className="px-4 py-2.5">
                         <span className="text-[10px] font-bold text-sp-admin-muted">—</span>
                       </td>
                     </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Facturación resumen */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Facturación</h2>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-emerald-600 font-semibold">Ingresos: {formatMoney(invoiceSummary.incomeTotal)}</span>
            <span className="text-sp-admin-muted">Pendiente: {formatMoney(invoiceSummary.pendingIncome)}</span>
          </div>
        </div>
        {invoices.length === 0 ? (
          <p className="px-4 py-6 text-[12px] text-sp-admin-muted text-center">No hay facturas para esta marca</p>
        ) : (
          <div className="divide-y divide-sp-admin-border/40 max-h-56 overflow-y-auto">
            {invoices.slice(0, 8).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
                <div>
                  <p className="text-[12px] font-medium text-sp-admin-text truncate max-w-[280px]">{inv.concept}</p>
                  <p className="text-[10px] text-sp-admin-muted">
                    {inv.number && `${inv.number} · `}{new Date(inv.issueDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[12px] font-bold tabular-nums ${inv.kind === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {inv.kind === 'expense' ? '-' : ''}{formatMoney(inv.totalAmount)}
                  </p>
                  <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">{inv.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );

  return (
    <div className="space-y-4 max-w-[1200px]">
      {/* Breadcrumb fuera de los tabs */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted">
        <Link href="/admin/brands" className="hover:text-sp-admin-accent transition-colors">Marcas</Link>
        <span>›</span>
        <span className="text-sp-admin-text font-medium">{brand.name}</span>
      </div>

      <BrandsTabs
        defaultKey="resumen"
        tabs={[
          { key: 'resumen', label: 'Resumen',  content: resumenContent },
          {
            key:     'briefs',
            label:   `Briefs${briefs.length > 0 ? ` (${briefs.length})` : ''}`,
            content: (
              <BrandBriefsTab
                brandId={brandId}
                briefs={briefs}
                isAdmin={isAdmin}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
