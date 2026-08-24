'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { updateDraftAction } from '@/app/admin/(dashboard)/automation-drafts/actions';
import type { AutomationDealValidationIssue } from '@/lib/automationDealValidation';
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS } from '@/lib/schemas/campaign';
import { DELIVERABLE_TYPES, DELIVERABLE_TYPE_LABELS } from '@/lib/schemas/deliverable';
import {
  draftDealEditorDefaults,
  draftDealEditorFormSchema,
  type DraftDealEditorFormInput,
} from '@/lib/schemas/automationDealDraftEditor';
import { SOCIAL_PLATFORM_VALUES } from '@/lib/schemas/talentSocials';

const INPUT_CLASS =
  'w-full rounded border border-sp-admin-border bg-sp-admin-bg2 px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-text/40 disabled:opacity-60';
const INVALID_CLASS = 'border-red-500/70 focus:border-red-400';

const PLATFORM_LABELS: Record<(typeof SOCIAL_PLATFORM_VALUES)[number], string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  kick: 'Kick',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
};

type Props = {
  readonly draftId: number;
  readonly proposedDeal: unknown;
  readonly serverIssues: readonly AutomationDealValidationIssue[];
  readonly canWrite: boolean;
};

function Label({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return <span className="mb-1 block text-xs text-sp-admin-muted">{children}</span>;
}

function Message({ children }: { readonly children: string | undefined }): React.ReactElement | null {
  return children ? <p className="mt-1 text-xs text-red-400">{children}</p> : null;
}

export function DraftDealEditor({
  draftId,
  proposedDeal,
  serverIssues,
  canWrite,
}: Props): React.ReactElement {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<DraftDealEditorFormInput>({
    resolver: zodResolver(draftDealEditorFormSchema),
    defaultValues: draftDealEditorDefaults(proposedDeal),
    mode: 'onSubmit',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'deliverables' });

  const hasServerIssue = (path: string): boolean => serverIssues.some(
    (issue) => issue.path === path || issue.path.startsWith(`${path}.`) || path.startsWith(`${issue.path}.`),
  );
  const fieldClass = (path: string, clientError?: string): string =>
    `${INPUT_CLASS} ${clientError || hasServerIssue(path) ? INVALID_CLASS : ''}`;

  const save = (values: DraftDealEditorFormInput): void => {
    setFeedback(null);
    setActionError(null);
    startTransition(async () => {
      const result = await updateDraftAction({ id: draftId, deal: values });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      const remaining = result.validationIssues?.length ?? 0;
      setFeedback(
        remaining === 0
          ? 'Cambios guardados. El borrador ya se puede aprobar.'
          : `Cambios guardados. Quedan ${remaining} campo${remaining === 1 ? '' : 's'} por corregir.`,
      );
      reset(values);
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-sp-admin-text">Datos del trato</h2>
          <p className="mt-1 text-xs text-sp-admin-muted">
            Los datos reconocidos ya están rellenados. Corrige únicamente lo marcado.
          </p>
        </div>
        {!canWrite ? <span className="text-xs text-sp-admin-muted">Solo lectura</span> : null}
      </div>

      {actionError ? (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {actionError}
        </div>
      ) : null}
      {feedback ? (
        <div className="mb-4 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {feedback}
        </div>
      ) : null}

      <form
        onSubmit={(event) => { void handleSubmit(save)(event); }}
        className="space-y-5"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2">
            <Label>Nombre del trato</Label>
            <input
              {...register('name')}
              disabled={!canWrite || pending}
              className={fieldClass('name', errors.name?.message)}
              placeholder="Creador × Marca"
            />
            <Message>{errors.name?.message}</Message>
          </label>

          <label>
            <Label>ID interno de la marca (si se conoce)</Label>
            <input
              {...register('brandId')}
              disabled={!canWrite || pending}
              className={fieldClass('brand.id', errors.brandId?.message)}
              inputMode="numeric"
              placeholder="Ej. 14"
            />
            <Message>{errors.brandId?.message}</Message>
          </label>
          <label>
            <Label>Nombre de la marca</Label>
            <input
              {...register('brandName')}
              disabled={!canWrite || pending}
              className={fieldClass('brand.name', errors.brandName?.message)}
              placeholder="Ej. SkinsMonkey"
            />
            <Message>{errors.brandName?.message}</Message>
          </label>
        </div>

        <div className="border-t border-sp-admin-border/60 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sp-admin-muted">Creador</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label>
              <Label>ID interno (si se conoce)</Label>
              <input {...register('talentId')} disabled={!canWrite || pending} className={fieldClass('talent.id', errors.talentId?.message)} inputMode="numeric" />
              <Message>{errors.talentId?.message}</Message>
            </label>
            <label>
              <Label>Nombre</Label>
              <input {...register('talentName')} disabled={!canWrite || pending} className={fieldClass('talent.name', errors.talentName?.message)} />
            </label>
            <label>
              <Label>Usuario / handle</Label>
              <input {...register('talentHandle')} disabled={!canWrite || pending} className={fieldClass('talent.handle', errors.talentHandle?.message)} placeholder="sin @" />
            </label>
            <label>
              <Label>Plataforma</Label>
              <select {...register('talentPlatform')} disabled={!canWrite || pending} className={fieldClass('talent.platform', errors.talentPlatform?.message)}>
                <option value="">Selecciona una</option>
                {SOCIAL_PLATFORM_VALUES.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
              </select>
            </label>
            <label>
              <Label>País (código de 2 letras)</Label>
              <input {...register('talentCountry')} disabled={!canWrite || pending} className={fieldClass('talent.country', errors.talentCountry?.message)} placeholder="ES" maxLength={2} />
            </label>
            <label>
              <Label>Juego (opcional)</Label>
              <input {...register('talentGame')} disabled={!canWrite || pending} className={INPUT_CLASS} />
            </label>
          </div>
        </div>

        <div className="border-t border-sp-admin-border/60 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sp-admin-muted">Fechas y estado</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label>
              <Label>Estado</Label>
              <select {...register('status')} disabled={!canWrite || pending} className={INPUT_CLASS}>
                {CAMPAIGN_STATUSES.map((status) => <option key={status} value={status}>{CAMPAIGN_STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <label>
              <Label>Fecha de inicio</Label>
              <input {...register('startDate')} disabled={!canWrite || pending} className={fieldClass('startDate', errors.startDate?.message)} placeholder="AAAA-MM-DD" />
              <Message>{errors.startDate?.message}</Message>
            </label>
            <label>
              <Label>Fecha de finalización</Label>
              <input {...register('endDate')} disabled={!canWrite || pending} className={fieldClass('endDate', errors.endDate?.message)} placeholder="AAAA-MM-DD" />
              <Message>{errors.endDate?.message}</Message>
            </label>
            <label>
              <Label>Duración (meses)</Label>
              <input {...register('durationMonths')} disabled={!canWrite || pending} className={fieldClass('durationMonths', errors.durationMonths?.message)} inputMode="numeric" />
              <Message>{errors.durationMonths?.message}</Message>
            </label>
            <label>
              <Label>Fecha límite de entrega</Label>
              <input {...register('deliveryDeadline')} disabled={!canWrite || pending} className={fieldClass('deliveryDeadline', errors.deliveryDeadline?.message)} placeholder="AAAA-MM-DD" />
              <Message>{errors.deliveryDeadline?.message}</Message>
            </label>
          </div>
        </div>

        <div className="border-t border-sp-admin-border/60 pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sp-admin-muted">Importes</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <label>
              <Label>Moneda</Label>
              <select {...register('currency')} disabled={!canWrite || pending} className={INPUT_CLASS}>
                <option value="EUR">EUR</option><option value="USD">USD</option>
              </select>
            </label>
            <label>
              <Label>Importe marca</Label>
              <input {...register('amountBrand')} disabled={!canWrite || pending} className={fieldClass('amountBrand', errors.amountBrand?.message)} inputMode="decimal" />
              <Message>{errors.amountBrand?.message}</Message>
            </label>
            <label>
              <Label>Pago creador</Label>
              <input {...register('amountTalent')} disabled={!canWrite || pending} className={fieldClass('amountTalent', errors.amountTalent?.message)} inputMode="decimal" />
              <Message>{errors.amountTalent?.message}</Message>
            </label>
            <label>
              <Label>Producto / crédito creador</Label>
              <input {...register('amountInKindTalent')} disabled={!canWrite || pending} className={fieldClass('amountInKindTalent', errors.amountInKindTalent?.message)} inputMode="decimal" />
            </label>
            <label>
              <Label>Sorteos / comunidad</Label>
              <input {...register('amountInKindCommunity')} disabled={!canWrite || pending} className={fieldClass('amountInKindCommunity', errors.amountInKindCommunity?.message)} inputMode="decimal" />
            </label>
          </div>
        </div>

        <div className="border-t border-sp-admin-border/60 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sp-admin-muted">Entregables</h3>
            {canWrite ? (
              <button type="button" disabled={pending || fields.length >= 50} onClick={() => append({ type: 'stream_integration', targetCount: '1', notes: '' })} className="rounded border border-sp-admin-border px-2 py-1 text-xs text-sp-admin-text hover:bg-sp-admin-bg2 disabled:opacity-40">
                + Añadir
              </button>
            ) : null}
          </div>
          {fields.length === 0 ? <p className="text-sm text-amber-300">Añade al menos un entregable.</p> : null}
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded border border-sp-admin-border/60 p-3 md:grid-cols-[1.2fr_100px_1.5fr_auto]">
                <select {...register(`deliverables.${index}.type`)} disabled={!canWrite || pending} className={fieldClass(`deliverables.${index}.type`, errors.deliverables?.[index]?.type?.message)} aria-label={`Tipo del entregable ${index + 1}`}>
                  {DELIVERABLE_TYPES.map((type) => <option key={type} value={type}>{DELIVERABLE_TYPE_LABELS[type]}</option>)}
                </select>
                <input {...register(`deliverables.${index}.targetCount`)} disabled={!canWrite || pending} className={fieldClass(`deliverables.${index}.targetCount`, errors.deliverables?.[index]?.targetCount?.message)} inputMode="numeric" aria-label={`Cantidad del entregable ${index + 1}`} />
                <input {...register(`deliverables.${index}.notes`)} disabled={!canWrite || pending} className={INPUT_CLASS} placeholder="Notas (opcional)" aria-label={`Notas del entregable ${index + 1}`} />
                {canWrite ? <button type="button" disabled={pending} onClick={() => remove(index)} className="rounded border border-sp-admin-border px-2 py-1 text-xs text-sp-admin-muted hover:text-red-400 disabled:opacity-40" aria-label={`Quitar entregable ${index + 1}`}>Quitar</button> : null}
                <Message>{errors.deliverables?.[index]?.targetCount?.message}</Message>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-sp-admin-border/60 pt-4 md:grid-cols-2">
          <label>
            <Label>Notas internas</Label>
            <textarea {...register('notes')} disabled={!canWrite || pending} rows={3} className={INPUT_CLASS} />
          </label>
          <label>
            <Label>Notas para el creador</Label>
            <textarea {...register('creatorNotes')} disabled={!canWrite || pending} rows={3} className={INPUT_CLASS} />
          </label>
          <label className="md:col-span-2">
            <Label>Google Sheet de seguimiento (opcional)</Label>
            <input {...register('trackingSheetUrl')} disabled={!canWrite || pending} className={fieldClass('trackingSheetUrl', errors.trackingSheetUrl?.message)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <Message>{errors.trackingSheetUrl?.message}</Message>
          </label>
        </div>

        {canWrite ? (
          <div className="flex items-center justify-end gap-3 border-t border-sp-admin-border/60 pt-4">
            {!isDirty ? <span className="text-xs text-sp-admin-muted">Modifica un campo para guardar</span> : null}
            <button type="submit" disabled={pending || !isDirty} className="rounded border border-sp-admin-accent/60 bg-sp-admin-accent/10 px-4 py-2 text-sm font-medium text-sp-admin-text hover:bg-sp-admin-accent/20 disabled:cursor-not-allowed disabled:opacity-40">
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
