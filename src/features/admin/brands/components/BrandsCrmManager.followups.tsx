'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeFollowupAction,
  deleteFollowupAction,
} from '@/app/admin/(dashboard)/brands/crm-actions';
import type { CrmBrandFollowup } from '@/types';
import type { CrmFollowupStatus } from '@/lib/schemas/crmBrand';
import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { BrandFollowupForm } from '@/features/admin/brands/components/BrandFollowupForm';
import {
  BTN_GHOST,
  CHANNEL_LABELS,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_STATUS_TONE,
} from './BrandsCrmManager.parts';

type FollowupsListProps = {
  readonly brandId: number;
  readonly followups: readonly CrmBrandFollowup[];
  readonly isManager: boolean;
  readonly staffUsers: readonly { id: string; name: string }[];
};

export function FollowupsList({ brandId, followups, isManager, staffUsers }: FollowupsListProps): React.ReactElement {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const pending = followups.filter((f) => !f.completedAt);
  const completed = followups.filter((f) => f.completedAt);

  const handleCreateSuccess = (): void => {
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-sp-admin-muted">
          Seguimientos ({pending.length} pendientes)
        </h4>
        <button type="button" onClick={() => setShowForm((v) => !v)} className={BTN_GHOST}>
          {showForm ? 'Cancelar' : '+ Añadir seguimiento'}
        </button>
      </div>

      {showForm && (
        <BrandFollowupForm
          brandId={brandId}
          followup={null}
          staffUsers={staffUsers}
          isManager={isManager}
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {followups.length === 0 && !showForm ? (
        <p className="text-xs italic text-sp-admin-muted py-2">Sin seguimientos todavía.</p>
      ) : (
        <div className="space-y-2 mt-2">
          {pending.map((f) => (
            <FollowupItem key={f.id} followup={f} brandId={brandId} isManager={isManager} staffUsers={staffUsers} />
          ))}
          {completed.length > 0 && (
            <details className="mt-2">
              <summary className="text-[10px] uppercase tracking-wider text-sp-admin-muted cursor-pointer select-none">
                Completados ({completed.length})
              </summary>
              <div className="space-y-2 mt-2">
                {completed.map((f) => (
                  <FollowupItem key={f.id} followup={f} brandId={brandId} isManager={isManager} staffUsers={staffUsers} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function FollowupItem({
  followup,
  brandId,
  isManager,
  staffUsers,
}: {
  readonly followup: CrmBrandFollowup;
  readonly brandId: number;
  readonly isManager: boolean;
  readonly staffUsers: readonly { id: string; name: string }[];
}): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const isDone = !!followup.completedAt;
  const isOverdue = !isDone && new Date(followup.scheduledAt) < new Date();

  const handleEditSuccess = (): void => {
    setEditing(false);
    router.refresh();
  };

  if (editing) {
    return (
      <BrandFollowupForm
        brandId={brandId}
        followup={followup}
        staffUsers={staffUsers}
        isManager={isManager}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const onComplete = (): void => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(followup.id));
      fd.set('brandId', String(brandId));
      await completeFollowupAction({}, fd);
      router.refresh();
    });
  };

  const onDelete = (): void => {
    if (!confirm('¿Eliminar este seguimiento?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(followup.id));
      fd.set('brandId', String(brandId));
      await deleteFollowupAction({}, fd);
      router.refresh();
    });
  };

  const date = new Date(followup.scheduledAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className={`rounded-xl px-3 py-2.5 text-xs border border-sp-admin-border ${
        isDone ? 'opacity-50' : isOverdue ? 'bg-red-500/10' : 'bg-sp-admin-bg'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`font-mono shrink-0 ${isOverdue ? 'text-red-400' : 'text-sp-admin-muted'}`}>
          {date}
        </span>
        <div className="flex-1 min-w-0">
          <span className={isDone ? 'line-through text-sp-admin-muted' : 'text-sp-admin-text'}>
            {followup.note}
          </span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {followup.channel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sp-admin-border/50 text-sp-admin-muted">
                {CHANNEL_LABELS[followup.channel]}
              </span>
            )}
            {followup.status && (
              <StateBadge tone={FOLLOWUP_STATUS_TONE[followup.status as CrmFollowupStatus]}>
                {FOLLOWUP_STATUS_LABELS[followup.status as CrmFollowupStatus]}
              </StateBadge>
            )}
            {followup.nextAction && (
              <span className="text-[10px] text-sp-admin-muted italic truncate">
                → {followup.nextAction}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isPending}
            className="px-2 py-0.5 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-50 cursor-pointer"
          >
            Editar
          </button>
          {!isDone && (
            <button
              type="button"
              onClick={onComplete}
              disabled={isPending}
              className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 cursor-pointer"
            >
              Completar
            </button>
          )}
          {!isManager && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="px-2 py-0.5 rounded text-[10px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
            >
              Borrar
            </button>
          )}
        </div>
      </div>
      {followup.summary && (
        <p className="mt-2 text-sp-admin-muted/80 italic pl-0 line-clamp-2">{followup.summary}</p>
      )}
    </div>
  );
}
