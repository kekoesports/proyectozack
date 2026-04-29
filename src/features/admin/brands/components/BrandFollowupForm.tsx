'use client';

import { useActionState, useEffect, useState } from 'react';

import {
  createFollowupAction,
  updateFollowupAction,
} from '@/app/admin/(dashboard)/brands/crm-actions';
import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import {
  CRM_FOLLOWUP_CHANNELS,
  CRM_FOLLOWUP_STATUSES,
} from '@/lib/schemas/crmBrand';

import type { CrmBrandFollowup } from '@/types';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';
import type { CrmFollowupStatus } from '@/lib/schemas/crmBrand';

type BrandFollowupFormProps = {
  readonly brandId: number;
  readonly followup: CrmBrandFollowup | null;
  readonly staffUsers: readonly { id: string; name: string }[];
  readonly onSuccess: () => void;
  readonly onCancel: () => void;
  readonly isManager: boolean;
};

const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL =
  'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const BTN_PRIMARY =
  'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
const BTN_GHOST =
  'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';

const CHANNEL_LABELS: Record<(typeof CRM_FOLLOWUP_CHANNELS)[number], string> = {
  email: 'Email',
  telegram: 'Telegram',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  reunion: 'Reunión',
  llamada: 'Llamada',
  otro: 'Otro',
};

const STATUS_LABELS: Record<CrmFollowupStatus, string> = {
  pendiente: 'Pendiente',
  hecho: 'Hecho',
  vencido: 'Vencido',
};

const STATUS_TONE: Record<CrmFollowupStatus, Tone> = {
  pendiente: 'warning',
  hecho: 'success',
  vencido: 'danger',
};

function toDateInputValue(val: Date | string | null | undefined): string {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Formulario de creación/edición de follow-ups (seguimientos) sobre una marca del CRM.
 *
 * @kind client
 * @feature admin/brands
 * @route /admin/brands
 */
export function BrandFollowupForm({
  brandId,
  followup,
  staffUsers,
  onSuccess,
  onCancel,
}: BrandFollowupFormProps): React.ReactElement {
  const isEdit = followup !== null;
  const action = isEdit ? updateFollowupAction : createFollowupAction;
  const [state, formAction, isPending] = useActionState(action, {});

  const [liveStatus, setLiveStatus] = useState<CrmFollowupStatus>(
    followup?.status ?? 'pendiente',
  );

  useEffect(() => {
    if (state.success && !isPending) {
      onSuccess();
    }
  }, [state.success, isPending, onSuccess]);

  const uid = followup?.id ?? 'new';
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={formAction}
      className="rounded-xl bg-sp-admin-bg border border-sp-admin-border p-4 space-y-4"
    >
      <input type="hidden" name="brandId" value={brandId} />
      {isEdit && <input type="hidden" name="id" value={followup.id} />}

      {/* Fecha + Canal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor={`bff-date-${uid}`}>
            Fecha *
          </label>
          <input
            id={`bff-date-${uid}`}
            name="scheduledAt"
            type="date"
            required
            min={isEdit ? undefined : todayIso}
            defaultValue={toDateInputValue(followup?.scheduledAt)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`bff-channel-${uid}`}>
            Canal
          </label>
          <select
            id={`bff-channel-${uid}`}
            name="channel"
            defaultValue={followup?.channel ?? ''}
            className={INPUT}
          >
            <option value="">— Sin especificar —</option>
            {CRM_FOLLOWUP_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                {CHANNEL_LABELS[ch]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado (con badge live) */}
      <div>
        <label className={LABEL} htmlFor={`bff-status-${uid}`}>
          Estado
        </label>
        <div className="flex items-center gap-3">
          <select
            id={`bff-status-${uid}`}
            name="status"
            value={liveStatus}
            onChange={(e) => setLiveStatus(e.target.value as CrmFollowupStatus)}
            className={`${INPUT} flex-1`}
          >
            {CRM_FOLLOWUP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <StateBadge tone={STATUS_TONE[liveStatus]}>
            {STATUS_LABELS[liveStatus]}
          </StateBadge>
        </div>
      </div>

      {/* Nota */}
      <div>
        <label className={LABEL} htmlFor={`bff-note-${uid}`}>
          Nota *
        </label>
        <textarea
          id={`bff-note-${uid}`}
          name="note"
          required
          rows={3}
          maxLength={1000}
          defaultValue={followup?.note ?? ''}
          className={`${INPUT} resize-none`}
          placeholder="Llamar para revisar propuesta..."
        />
      </div>

      {/* Resumen */}
      <div>
        <label className={LABEL} htmlFor={`bff-summary-${uid}`}>
          Resumen
        </label>
        <textarea
          id={`bff-summary-${uid}`}
          name="summary"
          rows={2}
          defaultValue={followup?.summary ?? ''}
          className={`${INPUT} resize-none`}
          placeholder="Resumen de lo acordado..."
        />
      </div>

      {/* Próxima acción + Fecha próxima acción */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor={`bff-nextAction-${uid}`}>
            Próxima acción
          </label>
          <input
            id={`bff-nextAction-${uid}`}
            name="nextAction"
            maxLength={300}
            defaultValue={followup?.nextAction ?? ''}
            className={INPUT}
            placeholder="Enviar propuesta de precios..."
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`bff-nextActionAt-${uid}`}>
            Fecha próxima acción
          </label>
          <input
            id={`bff-nextActionAt-${uid}`}
            name="nextActionAt"
            type="date"
            defaultValue={toDateInputValue(followup?.nextActionAt)}
            className={INPUT}
          />
        </div>
      </div>

      {/* Asignado a + Responsable */}
      {staffUsers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor={`bff-assigned-${uid}`}>
              Asignado a
            </label>
            <select
              id={`bff-assigned-${uid}`}
              name="assignedToUserId"
              defaultValue={followup?.assignedToUserId ?? ''}
              className={INPUT}
            >
              <option value="">— Sin asignar —</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor={`bff-responsible-${uid}`}>
              Responsable
            </label>
            <select
              id={`bff-responsible-${uid}`}
              name="responsibleUserId"
              defaultValue={followup?.responsibleUserId ?? ''}
              className={INPUT}
            >
              <option value="">— Sin especificar —</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {state.error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className={BTN_GHOST}>
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
          {isPending
            ? 'Guardando...'
            : isEdit
              ? 'Guardar cambios'
              : 'Añadir seguimiento'}
        </button>
      </div>
    </form>
  );
}
