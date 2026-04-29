'use client';

import { useState, useActionState, useTransition } from 'react';
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_COLORS,
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_TYPES,
  ALLOWED_TRANSITIONS,
} from '@/lib/schemas/deliverable';
import {
  createDeliverableAction,
  transitionDeliverableAction,
  deleteDeliverableAction,
} from '@/app/admin/(dashboard)/campanas/[id]/deliverable-actions';
import type { DeliverableWithComments } from '@/lib/queries/deliverables';

const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL =
  'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';

type Props = {
  readonly campaignId: number;
  readonly talentId: number;
  readonly deliverables: readonly DeliverableWithComments[];
  readonly isManager: boolean;
};

/**
 * Gestiona los deliverables de una campaña con flujo de aprobación completo.
 * Estados: pending_submission → submitted → internal_review → brand_review → approved / revision_requested / rejected.
 *
 * @kind client
 * @feature admin/campaigns
 * @route /admin/campanas/[id]
 */
export function CampaignDeliverables({
  campaignId,
  talentId,
  deliverables,
  isManager,
}: Props): React.ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [transitionState, setTransitionState] = useState<{
    deliverableId: number;
    pending: boolean;
    error?: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const [createState, createFormAction, isCreating] = useActionState(createDeliverableAction, {
    success: false,
    error: 'Sin errores',
  } as { readonly success: false; readonly error: string });

  async function handleTransition(
    deliverableId: number,
    nextStatus: string,
    comment?: string,
    contentUrl?: string,
  ): Promise<void> {
    setTransitionState({ deliverableId, pending: true });
    startTransition(async () => {
      const payload: Parameters<typeof transitionDeliverableAction>[0] = {
        deliverableId,
        status: nextStatus,
        campaignId,
      };
      if (comment) payload.comment = comment;
      if (contentUrl) payload.contentUrl = contentUrl;
      const result = await transitionDeliverableAction(payload);
      if (!result.success) {
        setTransitionState({ deliverableId, pending: false, error: result.error });
      } else {
        setTransitionState(null);
      }
    });
  }

  async function handleDelete(deliverableId: number): Promise<void> {
    if (!confirm('¿Eliminar este deliverable?')) return;
    startTransition(async () => {
      await deleteDeliverableAction(deliverableId, campaignId);
    });
  }

  const approvedCount = deliverables.filter((d) => d.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sp-admin-text text-sm">Deliverables</h2>
          <p className="text-xs text-sp-admin-muted mt-0.5">
            {approvedCount} / {deliverables.length} aprobados
          </p>
        </div>
        {!isManager && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 transition-opacity cursor-pointer"
          >
            {showForm ? 'Cancelar' : '+ Nuevo deliverable'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          action={createFormAction}
          className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-3"
        >
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="talentId" value={talentId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>Título *</label>
              <input name="title" required maxLength={200} placeholder="Ej: Integración stream 30 min" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Tipo *</label>
              <select name="type" required className={INPUT}>
                <option value="">— Selecciona —</option>
                {DELIVERABLE_TYPES.map((t) => (
                  <option key={t} value={t}>{DELIVERABLE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fecha límite</label>
              <input name="dueDate" type="date" className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Descripción</label>
              <textarea name="description" rows={2} className={INPUT} placeholder="Instrucciones, requisitos..." />
            </div>
          </div>

          {'error' in createState && createState.error && (
            <p className="text-xs text-red-400">{createState.error}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 rounded-full text-xs font-bold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {isCreating ? 'Creando...' : 'Crear deliverable'}
            </button>
          </div>
        </form>
      )}

      {/* Deliverable list */}
      {deliverables.length === 0 ? (
        <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5 text-center">
          <p className="text-sm text-sp-admin-muted">Sin deliverables. Añade el primero.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((d) => {
            const isExpanded = expandedId === d.id;
            const allowedTransitions = ALLOWED_TRANSITIONS[d.status];
            const isBusy = transitionState?.deliverableId === d.id && transitionState.pending;

            return (
              <div
                key={d.id}
                className="rounded-2xl border border-sp-admin-border bg-sp-admin-card overflow-hidden"
              >
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-sp-admin-hover/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${DELIVERABLE_STATUS_COLORS[d.status]}`}
                    >
                      {DELIVERABLE_STATUS_LABELS[d.status]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-sp-admin-text truncate">{d.title}</p>
                      <p className="text-xs text-sp-admin-muted">{DELIVERABLE_TYPE_LABELS[d.type]}</p>
                    </div>
                  </div>
                  <span className="text-sp-admin-muted text-xs shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-sp-admin-border p-4 space-y-4">
                    {d.description && (
                      <p className="text-xs text-sp-admin-muted leading-relaxed">{d.description}</p>
                    )}

                    {d.contentUrl && (
                      <a
                        href={d.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sp-admin-accent hover:opacity-80 block truncate"
                      >
                        🔗 {d.contentUrl}
                      </a>
                    )}

                    {d.dueDate && (
                      <p className="text-xs text-sp-admin-muted">
                        Fecha límite:{' '}
                        <strong className="text-sp-admin-text">
                          {new Date(d.dueDate).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </p>
                    )}

                    {/* Comments / audit trail */}
                    {d.comments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                          Historial
                        </p>
                        {d.comments.map((c) => (
                          <div key={c.id} className="flex gap-2 text-xs">
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${DELIVERABLE_STATUS_COLORS[c.statusSnapshot]}`}>
                              {DELIVERABLE_STATUS_LABELS[c.statusSnapshot]}
                            </span>
                            <p className="text-sp-admin-muted leading-relaxed">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Transition buttons */}
                    {!isManager && allowedTransitions.length > 0 && (
                      <TransitionButtons
                        deliverable={d}
                        allowedTransitions={allowedTransitions}
                        isBusy={isBusy}
                        onTransition={handleTransition}
                      />
                    )}

                    {transitionState?.deliverableId === d.id && transitionState.error && (
                      <p className="text-xs text-red-400">{transitionState.error}</p>
                    )}

                    {/* Delete (only for pending deliverables, non-manager) */}
                    {!isManager && d.status === 'pending_submission' && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(d.id)}
                        className="text-xs text-red-400 hover:underline cursor-pointer"
                      >
                        Eliminar deliverable
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: transition buttons with inline form for submitted status ──

type TransitionButtonsProps = {
  readonly deliverable: DeliverableWithComments;
  readonly allowedTransitions: readonly string[];
  readonly isBusy: boolean;
  readonly onTransition: (id: number, status: string, comment?: string, contentUrl?: string) => void;
};

function TransitionButtons({
  deliverable,
  allowedTransitions,
  isBusy,
  onTransition,
}: TransitionButtonsProps): React.ReactElement {
  const [comment, setComment] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const needsContent = selectedStatus === 'submitted';
  const needsRevisionNote = selectedStatus === 'revision_requested';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allowedTransitions.map((nextStatus) => {
          const isDestructive = nextStatus === 'rejected';
          const isPositive = nextStatus === 'approved';
          return (
            <button
              key={nextStatus}
              type="button"
              disabled={isBusy}
              onClick={() => setSelectedStatus(nextStatus === selectedStatus ? null : nextStatus)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                selectedStatus === nextStatus
                  ? 'ring-2 ring-sp-admin-accent'
                  : ''
              } ${
                isDestructive
                  ? 'border border-red-400 text-red-400 hover:bg-red-500/10'
                  : isPositive
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text hover:border-sp-admin-muted'
              }`}
            >
              {DELIVERABLE_STATUS_LABELS[nextStatus as keyof typeof DELIVERABLE_STATUS_LABELS]}
            </button>
          );
        })}
      </div>

      {selectedStatus && (
        <div className="space-y-2 p-3 rounded-xl bg-sp-admin-bg border border-sp-admin-border">
          {needsContent && (
            <div>
              <label className={LABEL}>URL del contenido</label>
              <input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://twitch.tv/... o https://youtu.be/..."
                className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-card px-3 py-2 text-xs text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
              />
            </div>
          )}
          {needsRevisionNote && (
            <div>
              <label className={LABEL}>Nota de revisión (requerida)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe qué debe corregirse..."
                rows={2}
                className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-card px-3 py-2 text-xs text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
              />
            </div>
          )}
          {!needsRevisionNote && (
            <div>
              <label className={LABEL}>Comentario (opcional)</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Observaciones..."
                className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-card px-3 py-2 text-xs text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
              />
            </div>
          )}
          <button
            type="button"
            disabled={isBusy || (needsRevisionNote && !comment.trim())}
            onClick={() => {
              onTransition(deliverable.id, selectedStatus, comment || undefined, contentUrl || undefined);
              setSelectedStatus(null);
              setComment('');
              setContentUrl('');
            }}
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {isBusy ? 'Actualizando...' : `Confirmar: ${DELIVERABLE_STATUS_LABELS[selectedStatus as keyof typeof DELIVERABLE_STATUS_LABELS]}`}
          </button>
        </div>
      )}
    </div>
  );
}
