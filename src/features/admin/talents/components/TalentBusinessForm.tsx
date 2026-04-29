'use client';

import { useActionState, useState } from 'react';
import { updateTalentBusinessAction } from '@/app/admin/(dashboard)/talents/[id]/negocio/business-actions';
import type { TalentBusiness, TalentVertical } from '@/types';
import { TALENT_VERTICALS, TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';

const INPUT = 'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';

type Props = {
  readonly talentId: number;
  readonly business: TalentBusiness | null;
  readonly verticals: readonly TalentVertical[];
};

/**
 * Formulario de datos de negocio del talent (verticales, condiciones comerciales) usando server action de actualización.
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents/[id]/negocio
 * @example
 * ```tsx
 * <TalentBusinessForm talentId={talent.id} business={business} verticals={verticals} />
 * ```
 */
export function TalentBusinessForm({ talentId, business, verticals }: Props): React.ReactElement {
  const [state, formAction, isPending] = useActionState(updateTalentBusinessAction, {});
  const [selected, setSelected] = useState<Set<TalentVertical>>(new Set(verticals));

  const toggle = (v: TalentVertical): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="talentId" value={talentId} />

      {/* Verticales */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-3">Verticales de negocio</h2>
        <p className="text-xs text-sp-admin-muted mb-4">
          Selecciona los tipos de campañas que este creador acepta. Útil para filtrar al proponer marcas.
        </p>
        <div className="flex flex-wrap gap-2">
          {TALENT_VERTICALS.map((v) => {
            const isOn = selected.has(v);
            return (
              <label
                key={v}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
                  isOn
                    ? 'bg-sp-admin-accent text-sp-admin-bg border-sp-admin-accent'
                    : 'bg-sp-admin-bg text-sp-admin-muted border-sp-admin-border hover:text-sp-admin-text hover:border-sp-admin-muted/50'
                }`}
              >
                <input type="checkbox" name="verticals" value={v} checked={isOn} onChange={() => toggle(v)} className="sr-only" />
                {TALENT_VERTICAL_LABELS[v]}
              </label>
            );
          })}
        </div>
      </section>

      {/* Contacto interno */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-3">Contacto interno</h2>
        <p className="text-xs text-sp-admin-muted mb-4">
          Datos de contacto privados para uso interno de la agencia. No se muestran públicamente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Telegram</label>
            <input name="telegram" placeholder="@usuario" defaultValue={business?.telegram ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>WhatsApp</label>
            <input name="whatsapp" placeholder="+34 ..." defaultValue={business?.whatsapp ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Discord</label>
            <input name="discord" placeholder="usuario#1234 o usuario" defaultValue={business?.discord ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email de contacto</label>
            <input name="contactEmail" type="email" defaultValue={business?.contactEmail ?? ''} className={INPUT} />
          </div>
        </div>
      </section>

      {/* Manager */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-3">Manager o representante</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Nombre</label>
            <input name="managerName" defaultValue={business?.managerName ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email manager</label>
            <input name="managerEmail" type="email" defaultValue={business?.managerEmail ?? ''} className={INPUT} />
          </div>
        </div>
      </section>

      {/* Notas */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-3">Notas</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={LABEL}>Tarifas y condiciones</label>
            <textarea name="rateNotes" rows={3} placeholder="Tarifa stream, vídeo dedicado, integración..." defaultValue={business?.rateNotes ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Notas internas</label>
            <textarea name="internalNotes" rows={4} defaultValue={business?.internalNotes ?? ''} className={INPUT} />
          </div>
        </div>
      </section>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-400">Cambios guardados.</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
