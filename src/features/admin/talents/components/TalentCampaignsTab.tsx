'use client';

import Link from 'next/link';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_ACTION_LABELS } from '@/lib/schemas/campaign';

import type { Tone } from '@/features/admin/_shared/components/StateBadge';
import type { CampaignTalentSummary } from '@/lib/queries/campaigns';
import type { CampaignStatus } from '@/lib/schemas/campaign';
import type { CampaignRow } from '@/types';

type Props = {
  readonly talentId: number;
  readonly campaigns: readonly CampaignRow[];
  readonly summary: CampaignTalentSummary;
};

const STATUS_TONE: Record<CampaignStatus, Tone> = {
  propuesta: 'neutral',
  negociacion: 'warning',
  aprobada: 'info',
  activa: 'success',
  completada: 'success',
  cancelada: 'danger',
  pendiente_pago: 'warning',
  pagada: 'success',
};

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

function fmt(n: number): string {
  return EUR.format(n);
}

/**
 * Tab "Campañas" del perfil del talent con histórico de campañas y resumen agregado (totales, importes).
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents/[id]
 * @example
 * ```tsx
 * <TalentCampaignsTab talentId={talent.id} campaigns={campaigns} summary={summary} />
 * ```
 */
export function TalentCampaignsTab({ talentId, campaigns, summary }: Props): React.ReactElement {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border">
        <EmptyState
          title="Sin campañas"
          description="Este talento no tiene campañas registradas todavía."
          action={
            <Link
              href={`/admin/campanas?talentId=${talentId}`}
              className="text-xs text-sp-admin-accent hover:underline"
            >
              Ver en campañas →
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
              <th className="text-left px-4 py-2.5 font-semibold text-sp-admin-muted uppercase tracking-wider">
                Nombre
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-sp-admin-muted uppercase tracking-wider">
                Estado
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-sp-admin-muted uppercase tracking-wider">
                Tipo
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-sp-admin-muted uppercase tracking-wider">
                Pago talento
              </th>
              <th className="text-left px-4 py-2.5 font-semibold text-sp-admin-muted uppercase tracking-wider">
                Inicio
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const amountTalent = Number(c.amountTalent);
              const startDate = c.startDate
                ? new Date(c.startDate).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—';

              return (
                <tr
                  key={c.id}
                  className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-sp-admin-text">
                    <Link
                      href={`/admin/campanas/${c.id}`}
                      className="hover:text-sp-admin-accent transition-colors"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StateBadge tone={STATUS_TONE[c.status as CampaignStatus]}>
                      {CAMPAIGN_STATUS_LABELS[c.status as CampaignStatus] ?? c.status}
                    </StateBadge>
                  </td>
                  <td className="px-4 py-3 text-sp-admin-muted">
                    {CAMPAIGN_ACTION_LABELS[c.actionType] ?? c.actionType}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sp-admin-text">
                    {fmt(amountTalent)}
                  </td>
                  <td className="px-4 py-3 text-sp-admin-muted">{startDate}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/campanas/${c.id}`}
                      className="text-sp-admin-accent hover:underline text-[10px] font-semibold"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer agregado */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-sp-admin-border bg-sp-admin-bg/30">
        <p className="text-xs text-sp-admin-muted">
          <span className="font-semibold text-sp-admin-text">Total generado: {fmt(summary.totalAmountTalent)}</span>
          {' · '}
          <span>{summary.count} {summary.count === 1 ? 'campaña' : 'campañas'}</span>
        </p>
        <Link
          href={`/admin/campanas?talentId=${talentId}`}
          className="text-[10px] font-semibold text-sp-admin-accent hover:underline"
        >
          Ver todas →
        </Link>
      </div>
    </div>
  );
}
