'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { CAMPAIGN_ACTION_LABELS, CAMPAIGN_STATUS_LABELS } from '@/lib/schemas/campaign';

import type { Tone } from '@/features/admin/_shared/components/StateBadge';
import type { CampaignWithRelations } from '@/lib/queries/campaigns';
import type { CampaignPaymentDerivedStatus } from '@/lib/schemas/campaign';

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

function paymentTone(status: CampaignPaymentDerivedStatus): Tone {
  if (status === 'si') return 'success';
  if (status === 'parcial') return 'warning';
  return 'neutral';
}

function paymentLabel(status: CampaignPaymentDerivedStatus): string {
  if (status === 'si') return 'Pagado';
  if (status === 'parcial') return 'Parcial';
  return 'Pendiente';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type KpiProps = {
  readonly label: string;
  readonly value: React.ReactNode;
};

function Kpi({ label, value }: KpiProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
        {label}
      </p>
      <div className="text-sm font-semibold text-sp-admin-text">{value}</div>
    </div>
  );
}

type InfoRowProps = {
  readonly label: string;
  readonly value: React.ReactNode;
};

function InfoRow({ label, value }: InfoRowProps): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-sp-admin-border/50 last:border-0">
      <p className="text-xs text-sp-admin-muted shrink-0">{label}</p>
      <div className="text-xs text-sp-admin-text text-right">{value}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Props = {
  readonly campaign: CampaignWithRelations;
};

/**
 * Tarjeta de resumen de una campaña (importes en EUR, comisión = amountBrand - amountTalent, estado, fechas).
 *
 * @kind server
 * @feature admin/campaigns
 * @route /admin/campanas/[id]
 */
export function CampaignSummaryCard({ campaign }: Props): React.ReactElement {
  const {
    amountBrand,
    amountTalent,
    commissionAmount,
    commissionPct,
    brandPaid,
    talentPaid,
    totalInvoicedBrand,
    totalPaidTalent,
    amountInKindTalent,
    amountInKindCommunity,
  } = campaign;

  const amountBrandNum = Number(amountBrand);
  const amountTalentNum = Number(amountTalent);

  // ── Alertas contextuales derivadas del estado del trato ──────────────
  type CampaignAlert = { readonly type: 'danger' | 'warning' | 'info'; readonly msg: string };
  const contextAlerts: CampaignAlert[] = [];

  const todayStr = useMemo(() => new Intl.DateTimeFormat('en-CA').format(new Date()), []);
  const daysLeft = campaign.endDate
    ? Math.ceil((new Date(campaign.endDate).getTime() - new Date(todayStr).getTime()) / 86_400_000)
    : null;

  if (daysLeft !== null && daysLeft <= 0 && ['activa', 'aprobada'].includes(campaign.status)) {
    contextAlerts.push({ type: 'danger', msg: `Trato vencido hace ${Math.abs(daysLeft)} días y sigue activo` });
  } else if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && ['activa', 'aprobada'].includes(campaign.status)) {
    contextAlerts.push({ type: 'warning', msg: `Trato próximo a vencer — quedan ${daysLeft} días` });
  }

  if (brandPaid === 'no' && amountBrandNum > 0 && !['cancelada', 'propuesta'].includes(campaign.status)) {
    contextAlerts.push({ type: 'warning', msg: `Pendiente de cobro a la marca — ${EUR.format(amountBrandNum)}` });
  }
  if (talentPaid === 'no' && amountTalentNum > 0 && ['completada', 'pagada', 'pendiente_pago'].includes(campaign.status)) {
    contextAlerts.push({ type: 'danger', msg: `Pendiente de pago al talento — ${EUR.format(amountTalentNum)}` });
  }
  if (['activa', 'completada'].includes(campaign.status) && totalInvoicedBrand === 0 && amountBrandNum > 0) {
    contextAlerts.push({ type: 'info', msg: 'Trato activo sin movimientos de facturación registrados' });
  }

  const ALERT_STYLE: Record<CampaignAlert['type'], string> = {
    danger:  'bg-red-50  border-red-200  text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
  };
  const ALERT_ICON: Record<CampaignAlert['type'], string> = {
    danger: '⚠', warning: '⚡', info: 'ℹ',
  };

  return (
    <div className="space-y-4">

      {/* Alertas contextuales */}
      {contextAlerts.length > 0 && (
        <div className="space-y-2">
          {contextAlerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-[12px] font-medium ${ALERT_STYLE[a.type]}`}>
              <span className="shrink-0 text-base leading-none">{ALERT_ICON[a.type]}</span>
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* KPI grid */}
      <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-4">Resumen financiero</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
          <Kpi
            label="Presupuesto previsto marca"
            value={EUR.format(amountBrandNum)}
          />
          <Kpi
            label="Presupuesto previsto influencer"
            value={EUR.format(amountTalentNum)}
          />
          <Kpi
            label="Comisión agencia"
            value={
              <span>
                {EUR.format(commissionAmount)}{' '}
                <span className="text-sp-admin-muted font-normal">
                  ({commissionPct.toFixed(1)}%)
                </span>
              </span>
            }
          />
          <Kpi
            label="Estado pago marca"
            value={
              <StateBadge tone={paymentTone(brandPaid)}>
                {paymentLabel(brandPaid)}
              </StateBadge>
            }
          />
          <Kpi
            label="Estado pago influencer"
            value={
              <StateBadge tone={paymentTone(talentPaid)}>
                {paymentLabel(talentPaid)}
              </StateBadge>
            }
          />
          <Kpi
            label="Total facturado marca"
            value={EUR.format(totalInvoicedBrand)}
          />
          <Kpi
            label="Total pagado influencer"
            value={EUR.format(totalPaidTalent)}
          />
        </div>
      </section>

      {/* Valor en especie — solo si hay algún valor */}
      {(amountInKindTalent !== null || amountInKindCommunity !== null) && (
        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
          <h2 className="font-bold text-sp-admin-text text-sm mb-4">Valor en especie <span className="font-normal text-sp-admin-muted text-xs">(no contabiliza como ingreso bancario)</span></h2>
          <div className="grid grid-cols-3 gap-x-6 gap-y-5">
            <Kpi
              label="Skins / giveaways talento"
              value={EUR.format(Number(amountInKindTalent ?? 0))}
            />
            <Kpi
              label="Sorteos comunidad"
              value={EUR.format(Number(amountInKindCommunity ?? 0))}
            />
            <Kpi
              label="Total en especie"
              value={
                <span className="text-sp-admin-accent">
                  {EUR.format(Number(amountInKindTalent ?? 0) + Number(amountInKindCommunity ?? 0))}
                </span>
              }
            />
          </div>
        </section>
      )}

      {/* Campaign details */}
      <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-3">Detalles</h2>
        <div>
          <InfoRow
            label="Marca"
            value={
              <Link
                href={`/admin/marcas/${campaign.brandId}`}
                className="text-sp-admin-accent hover:underline"
              >
                {campaign.brand.name}
              </Link>
            }
          />
          <InfoRow
            label="Influencer"
            value={
              <Link
                href={`/admin/talents/${campaign.talentId}`}
                className="text-sp-admin-accent hover:underline"
              >
                {campaign.talent.name}
              </Link>
            }
          />
          {campaign.brandContact !== null && (
            <InfoRow label="Contacto marca" value={campaign.brandContact.name} />
          )}
          {campaign.responsibleUser !== null && (
            <InfoRow label="Responsable" value={campaign.responsibleUser.name} />
          )}
          <InfoRow
            label="Tipo de acción"
            value={CAMPAIGN_ACTION_LABELS[campaign.actionType]}
          />
          <InfoRow
            label="Estado"
            value={CAMPAIGN_STATUS_LABELS[campaign.status]}
          />
          {campaign.sector !== null && (
            <InfoRow label="Sector" value={campaign.sector} />
          )}
          {campaign.geo !== null && (
            <InfoRow label="Geo" value={campaign.geo} />
          )}
          <InfoRow label="Fecha inicio" value={formatDate(campaign.startDate)} />
          <InfoRow label="Fecha fin" value={formatDate(campaign.endDate)} />
          {campaign.deliveryDeadline !== null && (
            <InfoRow label="Fecha entrega" value={formatDate(campaign.deliveryDeadline)} />
          )}
          {/* briefingUrl y contentUrl OCULTOS (PR: tratos-entregables-editables).
              Columnas DB conservadas; los valores guardados siguen accesibles
              vía queries. */}
          <InfoRow
            label="Creada"
            value={formatDate(campaign.createdAt.toISOString())}
          />
        </div>
      </section>

      {/* Notes */}
      {campaign.notes !== null && campaign.notes !== '' && (
        <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
          <h2 className="font-bold text-sp-admin-text text-sm mb-2">Notas</h2>
          <p className="text-sm text-sp-admin-muted leading-relaxed whitespace-pre-wrap">
            {campaign.notes}
          </p>
        </section>
      )}
    </div>
  );
}
