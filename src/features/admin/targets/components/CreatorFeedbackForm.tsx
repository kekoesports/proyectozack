'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { creatorFeedbackSchema, creatorFeedbackReasonSchema } from '@/lib/schemas/creator-search-profile';
import { STATUS_LABELS, type StatusValue } from './targets-constants';

type Feedback = z.infer<typeof creatorFeedbackSchema>;
const REASONS: Record<Feedback['reason'], string> = {
  audience_low: 'Audiencia insuficiente', wrong_content: 'Contenido no compatible', language: 'Idioma',
  country: 'País', inactive: 'Sin actividad reciente', already_represented: 'Ya representado',
  no_contact: 'Sin vía de contacto', not_interesting: 'No interesa', brand_incompatible: 'No encaja con la marca',
  contacted: 'Contacto realizado fuera de este formulario', agreement_completed: 'Acuerdo finalizado',
  reopened: 'Reabrir revisión', other: 'Otro motivo',
};
const INPUT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text';

export function CreatorFeedbackForm({ targetIds, status, pending, onSave, onCancel }: {
  readonly targetIds: readonly number[];
  readonly status: StatusValue;
  readonly pending: boolean;
  readonly onSave: (feedback: Feedback) => void;
  readonly onCancel: () => void;
}): React.ReactElement {
  const { register, handleSubmit, formState: { errors } } = useForm<Feedback>({
    // Empty selection is invalid (zero is rejected by the schema), never a synthetic saved ID.
    resolver: zodResolver(creatorFeedbackSchema), defaultValues: { targetId: targetIds[0] ?? 0, status, note: '' },
  });
  return (
    <form onSubmit={(event) => { void handleSubmit(onSave)(event); }} className="space-y-3 rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
      <h3 className="text-sm font-semibold text-sp-admin-text">Registrar {STATUS_LABELS[status]} en {targetIds.length} perfil{targetIds.length === 1 ? '' : 'es'}</h3>
      <p className="text-xs text-sp-admin-muted">Solo registra una decisión interna y su motivo; no envía mensajes, emails ni crea acuerdos. El mismo motivo se aplicará a la selección.</p>
      <label className="block space-y-1 text-xs text-sp-admin-muted">Motivo de la decisión
        <select {...register('reason')} defaultValue="" className={INPUT}>
          <option value="" disabled>Selecciona un motivo</option>
          {creatorFeedbackReasonSchema.options.map((reason) => <option key={reason} value={reason}>{REASONS[reason]}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-xs text-sp-admin-muted">Nota interna (opcional)
        <textarea {...register('note')} rows={2} maxLength={1000} className={INPUT} />
      </label>
      {Object.keys(errors).length > 0 && <p role="alert" className="text-xs text-amber-300">Selecciona un motivo válido y revisa la nota.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-sp-admin-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{pending ? 'Guardando…' : 'Guardar decisión'}</button>
        <button type="button" disabled={pending} onClick={onCancel} className="rounded-lg border border-sp-admin-border px-4 py-2 text-xs text-sp-admin-muted">Cancelar</button>
      </div>
    </form>
  );
}
