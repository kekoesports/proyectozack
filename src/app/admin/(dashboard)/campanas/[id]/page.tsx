import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAnyRole } from '@/lib/auth-guard';
import { getCampaign } from '@/lib/queries/campaigns';
import { StatusBadge, PaidBadge, formatMoney, PAYMENT_METHODS, STATUS_CONFIG } from '@/components/admin/campaigns/CampaignsManager';
import { markBrandPaidAction, markTalentPaidAction } from '../campaign-actions';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

// ── Page ─────────────────────────────────────────────────────────────

export default async function CampaignDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const campaignId = Number(id);
  if (isNaN(campaignId)) notFound();

  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const c = await getCampaign(campaignId);
  if (!c) notFound();

  const amountBrand  = Number(c.amountBrand  ?? 0);
  const amountTalent = Number(c.amountTalent ?? 0);
  const agencyFee    = amountBrand - amountTalent;
  const marginPct    = amountBrand > 0 ? ((agencyFee / amountBrand) * 100).toFixed(1) : '0';
  const pendingBrand  = c.brandPaid  ? 0 : amountBrand;
  const pendingTalent = c.talentPaid ? 0 : amountTalent;

  const eur = (n: number) =>
    n === 0 ? '0 €' :
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-5 max-w-[1100px]">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted">
        <Link href="/admin/campanas" className="hover:text-sp-admin-accent transition-colors">Tratos</Link>
        <span>›</span>
        <span className="text-sp-admin-text font-medium truncate max-w-[300px]">{c.name}</span>
      </div>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div
          className="h-2 w-full"
          style={{ background: STATUS_CONFIG[c.status]?.color ?? '#888' }}
        />
        <div className="px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-sp-admin-text">{c.name}</h1>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-sp-admin-muted flex-wrap">
              {c.brandName && (
                <Link href={`/admin/brands/${c.brandId}`} className="hover:text-sp-admin-accent transition-colors font-medium">
                  🏢 {c.brandName}
                </Link>
              )}
              {c.talentName && (
                <Link href={`/admin/talents/${c.talentId}`} className="hover:text-sp-admin-accent transition-colors font-medium">
                  ⭐ {c.talentName}
                </Link>
              )}
              {c.sector && <span>· {c.sector}</span>}
              {c.geo    && <span>· {c.geo}</span>}
              {c.startDate && c.endDate && (
                <span>· {new Date(c.startDate).toLocaleDateString('es-ES')} → {new Date(c.endDate).toLocaleDateString('es-ES')}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/campanas"
              className="h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] font-medium text-sp-admin-muted hover:bg-sp-admin-hover transition-colors flex items-center"
            >
              ← Volver
            </Link>
          </div>
        </div>
      </div>

      {/* ── 7 KPIs económicos ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Pago marca',     value: eur(amountBrand),  color: '#f5632a' },
          { label: 'Pago influencer',value: eur(amountTalent), color: '#8b3aad' },
          { label: 'Fee agencia',    value: agencyFee > 0 ? eur(agencyFee) : '—', color: '#5b9bd5' },
          { label: '% Comisión',     value: amountBrand > 0 ? `${marginPct}%` : '—', color: '#e8a800' },
          { label: 'Margen neto',    value: eur(agencyFee), color: agencyFee >= 0 ? '#16a34a' : '#ef4444' },
          { label: 'Pdte. cobro',    value: eur(pendingBrand),  color: pendingBrand > 0 ? '#f59e0b' : '#16a34a' },
          { label: 'Pdte. talent',   value: eur(pendingTalent), color: pendingTalent > 0 ? '#ef4444' : '#16a34a' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: k.color }} />
            <div className="px-3 py-2.5">
              <p className="text-[8px] font-bold uppercase tracking-wide text-sp-admin-muted truncate">{k.label}</p>
              <p className="text-[14px] font-bold mt-0.5 tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Dos columnas: Resumen + Pagos ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── RESUMEN ─────────────────────────────────────────────── */}
        <section className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Resumen</h2>
          </div>
          <div className="p-5 space-y-3">
            <InfoRow label="Estado">    <StatusBadge status={c.status} /></InfoRow>
            <InfoRow label="Marca">     {c.brandName  ? <Link href={`/admin/brands/${c.brandId}`}   className="text-sp-admin-accent hover:underline">{c.brandName}</Link>  : '—'}</InfoRow>
            <InfoRow label="Influencer">{c.talentName ? <Link href={`/admin/talents/${c.talentId}`} className="text-sp-admin-accent hover:underline">{c.talentName}</Link> : '—'}</InfoRow>
            <InfoRow label="Sector">{c.sector ?? '—'}</InfoRow>
            <InfoRow label="GEO">{c.geo ?? '—'}</InfoRow>
            {c.startDate && <InfoRow label="Inicio">{new Date(c.startDate).toLocaleDateString('es-ES')}</InfoRow>}
            {c.endDate   && <InfoRow label="Fin">{new Date(c.endDate).toLocaleDateString('es-ES')}</InfoRow>}
            {c.responsibleUserId && <InfoRow label="Responsable">{c.ownerName ?? c.responsibleUserId}</InfoRow>}
            {c.description && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Descripción</p>
                <p className="text-[12px] text-sp-admin-text leading-relaxed">{c.description}</p>
              </div>
            )}
            {c.deliverables && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Deliverables</p>
                <p className="text-[12px] text-sp-admin-text leading-relaxed whitespace-pre-wrap">{c.deliverables}</p>
              </div>
            )}
            {c.notes && (
              <div className="pt-2 border-t border-sp-admin-border/50">
                <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Notas internas</p>
                <p className="text-[12px] text-sp-admin-text leading-relaxed">{c.notes}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── PAGOS ────────────────────────────────────────────────── */}
        <section className="space-y-4">

          {/* Pago de marca → agencia */}
          <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                Cobro de marca
              </h2>
              <PaidBadge paid={c.brandPaid} />
            </div>
            <div className="p-5 space-y-3">
              {c.brandPaid ? (
                <div className="grid grid-cols-2 gap-3">
                  {c.brandPaidDate   && <InfoRow label="Fecha">{new Date(c.brandPaidDate).toLocaleDateString('es-ES')}</InfoRow>}
                  {c.brandPaidAmount && <InfoRow label="Importe">{formatMoney(c.brandPaidAmount)}</InfoRow>}
                  {c.brandPaymentMethod && <InfoRow label="Método">{c.brandPaymentMethod}</InfoRow>}
                </div>
              ) : (
                <form className="space-y-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Importe recibido (€)</label>
                      <input type="number" step="0.01" name="amount" defaultValue={String(amountBrand || '')}
                        className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] focus:outline-none focus:border-sp-admin-accent/50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Método de cobro</label>
                      <select name="method" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] focus:outline-none focus:border-sp-admin-accent/50">
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    formAction={markBrandPaidAction}
                    className="w-full py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    ✓ Marcar como cobrado
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Pago de agencia → talent */}
          <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                Pago al influencer
              </h2>
              <PaidBadge paid={c.talentPaid} />
            </div>
            <div className="p-5 space-y-3">
              {c.talentPaid ? (
                <div className="grid grid-cols-2 gap-3">
                  {c.talentPaidDate   && <InfoRow label="Fecha">{new Date(c.talentPaidDate).toLocaleDateString('es-ES')}</InfoRow>}
                  {c.talentPaidAmount && <InfoRow label="Importe">{formatMoney(c.talentPaidAmount)}</InfoRow>}
                  {c.talentPaymentMethod && <InfoRow label="Método">{c.talentPaymentMethod}</InfoRow>}
                </div>
              ) : (
                <form className="space-y-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Importe pagado (€)</label>
                      <input type="number" step="0.01" name="amount" defaultValue={String(amountTalent || '')}
                        className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] focus:outline-none focus:border-sp-admin-accent/50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Método de pago</label>
                      <select name="method" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] focus:outline-none focus:border-sp-admin-accent/50">
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    formAction={markTalentPaidAction}
                    className={`w-full py-2 rounded-lg text-white text-[13px] font-semibold transition-colors ${
                      c.brandPaid
                        ? 'bg-sp-admin-accent hover:bg-sp-admin-accent/90'
                        : 'bg-slate-400 cursor-not-allowed opacity-60'
                    }`}
                    disabled={!c.brandPaid}
                    title={!c.brandPaid ? 'Primero marca el cobro de la marca' : ''}
                  >
                    ✓ Marcar influencer pagado
                  </button>
                  {!c.brandPaid && (
                    <p className="text-[10px] text-amber-600 text-center">⚠ Registra el cobro de la marca antes de pagar al influencer</p>
                  )}
                </form>
              )}
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}

// ── Helper de fila ────────────────────────────────────────────────────

function InfoRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] font-bold uppercase tracking-wide text-sp-admin-muted shrink-0">{label}</span>
      <span className="text-[12px] font-medium text-sp-admin-text text-right">{children}</span>
    </div>
  );
}
