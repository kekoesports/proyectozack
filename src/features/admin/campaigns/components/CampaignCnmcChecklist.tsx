'use client';

import { useOptimistic, useTransition } from 'react';
import {
  CNMC_CHECKLIST_ITEMS,
  CNMC_STATUS_LABELS,
  CNMC_STATUS_COLORS,
} from '@/lib/schemas/talentCompliance';
import { toggleCampaignCnmcChecklistAction } from '@/app/admin/(dashboard)/campanas/[id]/campaign-actions';
import type { CampaignWithRelations } from '@/lib/queries/campaigns';
import type { CnmcStatus } from '@/lib/schemas/talentCompliance';

type Props = {
  readonly campaign: CampaignWithRelations;
  readonly isManager: boolean;
};

/**
 * Widget de checklist CNMC para la vista de detalle de campaña.
 * Muestra los items de compliance requeridos por la LGCA y permite
 * al admin marcar el checklist como verificado de forma atómica.
 *
 * @kind client
 * @feature admin/campaigns
 * @route /admin/campanas/[id]
 */
export function CampaignCnmcChecklist({ campaign, isManager }: Props): React.ReactElement {
  const [, startTransition] = useTransition();
  const [optimisticOk, setOptimisticOk] = useOptimistic(campaign.cnmcChecklistOk);

  const talentCnmcStatus = (campaign.talent as { cnmcStatus?: CnmcStatus } | undefined)
    ?.cnmcStatus;

  function handleToggle(): void {
    if (isManager) return;
    const next = !optimisticOk;
    startTransition(async () => {
      setOptimisticOk(next);
      await toggleCampaignCnmcChecklistAction(campaign.id, next);
    });
  }

  const actionTypes = new Set(
    typeof campaign.actionType === 'string' ? [campaign.actionType] : [],
  );

  // Filter checklist items relevant to this campaign's action type
  const relevantItems = CNMC_CHECKLIST_ITEMS.filter((item) => {
    if (!item.platform) return true;
    if (item.platform === 'twitch' && (actionTypes.has('stream'))) return true;
    if (item.platform === 'youtube' && (actionTypes.has('video_youtube'))) return true;
    if (item.platform === 'instagram' && (actionTypes.has('story_instagram'))) return true;
    if (item.platform === 'tiktok' && (actionTypes.has('short_reel_tiktok'))) return true;
    return false;
  });

  return (
    <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-sp-admin-text text-sm">Compliance CNMC</h2>
          <p className="text-xs text-sp-admin-muted mt-0.5">
            Ley General de Comunicación Audiovisual (art. 94bis LGCA, vigente oct-2025)
          </p>
        </div>

        {/* Global checklist badge */}
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            optimisticOk
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {optimisticOk ? '✓ Verificado' : '⚠ Pendiente'}
        </span>
      </div>

      {/* Talent CNMC status */}
      {talentCnmcStatus && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-sp-admin-bg border border-sp-admin-border">
          <span className="text-xs text-sp-admin-muted">Estado CNMC del talent:</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${CNMC_STATUS_COLORS[talentCnmcStatus]}`}>
            {CNMC_STATUS_LABELS[talentCnmcStatus]}
          </span>
        </div>
      )}

      {/* Checklist items */}
      <ul className="space-y-2.5 mb-4">
        {relevantItems.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="mt-0.5 w-4 h-4 shrink-0 rounded border border-sp-admin-border/60 flex items-center justify-center text-[10px] text-sp-admin-muted">
              {optimisticOk ? '✓' : ''}
            </span>
            <div>
              <p className="text-xs font-semibold text-sp-admin-text">
                {item.label}
                {item.platform && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider font-bold text-sp-admin-muted">
                    ({item.platform})
                  </span>
                )}
              </p>
              <p className="text-xs text-sp-admin-muted">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Toggle button */}
      {!isManager && (
        <button
          type="button"
          onClick={handleToggle}
          className={`w-full rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer ${
            optimisticOk
              ? 'border border-sp-admin-border text-sp-admin-muted hover:text-red-400 hover:border-red-400'
              : 'bg-sp-admin-accent text-sp-admin-bg hover:opacity-90'
          }`}
        >
          {optimisticOk ? 'Marcar como no verificado' : 'Marcar checklist como verificado'}
        </button>
      )}

      {isManager && (
        <p className="text-xs text-sp-admin-muted text-center">
          Solo admin puede modificar el estado del checklist.
        </p>
      )}
    </section>
  );
}
