'use client';

import { useActionState } from 'react';
import { updateTalentComplianceAction } from '@/app/admin/(dashboard)/talents/[id]/negocio/compliance-actions';
import {
  CNMC_STATUSES,
  CNMC_STATUS_LABELS,
  CNMC_STATUS_COLORS,
  TALENT_TAX_TYPES,
  TALENT_TAX_TYPE_LABELS,
  IRPF_BY_TAX_TYPE,
  CNMC_CHECKLIST_ITEMS,
} from '@/lib/schemas/talentCompliance';
import type { Talent } from '@/types';

const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL =
  'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const SELECT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors cursor-pointer';

type Props = {
  readonly talent: Pick<
    Talent,
    | 'id'
    | 'cnmcStatus'
    | 'cnmcRegisteredAt'
    | 'cnmcNotes'
    | 'hasRcInsurance'
    | 'taxType'
    | 'nif'
    | 'fiscalName'
    | 'fiscalAddress'
  >;
};

/**
 * Formulario de compliance CNMC y datos fiscales del talent.
 * Incluye el estado de registro CNMC (Ley General de Comunicación Audiovisual, oct-2025),
 * seguro RC, y tipo fiscal para cálculo de retención IRPF.
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents/[id]
 * @example
 * ```tsx
 * <TalentComplianceForm talent={talent} />
 * ```
 */
export function TalentComplianceForm({ talent }: Props): React.ReactElement {
  const [state, formAction, isPending] = useActionState(updateTalentComplianceAction, {});

  const currentTaxType = talent.taxType ?? undefined;
  const irpfPct = currentTaxType ? IRPF_BY_TAX_TYPE[currentTaxType] : null;

  const cnmcRegisteredAt = talent.cnmcRegisteredAt
    ? new Date(talent.cnmcRegisteredAt).toISOString().split('T')[0]
    : '';

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="talentId" value={talent.id} />

      {/* CNMC Status */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sp-admin-text text-sm">Compliance CNMC</h2>
          <a
            href="https://www.cnmc.es/ambitos-de-actuacion/audiovisual/prestadores"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sp-admin-accent hover:opacity-80 transition-opacity"
          >
            Registro CNMC ↗
          </a>
        </div>
        <p className="text-xs text-sp-admin-muted mb-4">
          Ley General de Comunicación Audiovisual (art. 94bis LGCA, vigente oct-2025).
          Obligatorio para influencers con más de 10.000 seguidores y actividad comercial.
          Las sanciones por incumplimiento se extienden a la agencia intermediaria (hasta 300.000 €).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Estado de registro</label>
            <select name="cnmcStatus" defaultValue={talent.cnmcStatus ?? 'no_aplica'} className={SELECT}>
              {CNMC_STATUSES.map((s) => (
                <option key={s} value={s}>{CNMC_STATUS_LABELS[s]}</option>
              ))}
            </select>
            {talent.cnmcStatus && (
              <span className={`inline-flex mt-2 items-center px-2 py-0.5 rounded-full text-xs font-semibold ${CNMC_STATUS_COLORS[talent.cnmcStatus]}`}>
                {CNMC_STATUS_LABELS[talent.cnmcStatus]}
              </span>
            )}
          </div>

          <div>
            <label className={LABEL}>Fecha de registro</label>
            <input
              name="cnmcRegisteredAt"
              type="date"
              defaultValue={cnmcRegisteredAt}
              className={INPUT}
            />
          </div>

          <div className="md:col-span-2">
            <label className={LABEL}>Notas de compliance</label>
            <textarea
              name="cnmcNotes"
              rows={2}
              placeholder="Número de registro, observaciones, próxima renovación..."
              defaultValue={talent.cnmcNotes ?? ''}
              className={INPUT}
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="hasRcInsurance"
                defaultChecked={talent.hasRcInsurance}
                className="w-4 h-4 rounded accent-sp-admin-accent cursor-pointer"
              />
              <span className="text-sm text-sp-admin-text">
                Seguro de Responsabilidad Civil activo
                <span className="block text-xs text-sp-admin-muted font-normal mt-0.5">
                  Obligatorio para talentos registrados en CNMC. Debe estar vigente durante la campaña.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Checklist referencia — solo informativo, no se guarda por talent sino por campaña */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-2">Checklist de campaña (referencia)</h2>
        <p className="text-xs text-sp-admin-muted mb-4">
          Estos items se verifican individualmente en cada campaña antes de activarla.
          Aquí se muestra como referencia del estado actual del talent.
        </p>
        <ul className="space-y-2">
          {CNMC_CHECKLIST_ITEMS.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <span className="text-sp-admin-muted text-xs mt-0.5">•</span>
              <div>
                <p className="text-xs font-semibold text-sp-admin-text">
                  {item.label}
                  {item.platform && (
                    <span className="ml-1 text-[10px] uppercase font-bold text-sp-admin-muted">
                      ({item.platform})
                    </span>
                  )}
                </p>
                <p className="text-xs text-sp-admin-muted">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Fiscalidad */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-3">Datos fiscales</h2>
        <p className="text-xs text-sp-admin-muted mb-4">
          Información fiscal para generación de facturas y cálculo de retención IRPF.
          Sensible — solo visible para admin.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Tipo fiscal</label>
            <select name="taxType" defaultValue={talent.taxType ?? ''} className={SELECT}>
              <option value="">-- Sin definir --</option>
              {TALENT_TAX_TYPES.map((t) => (
                <option key={t} value={t}>{TALENT_TAX_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {irpfPct !== null && (
              <p className="text-xs text-sp-admin-muted mt-1">
                Retención IRPF aplicable: <strong className="text-sp-admin-accent">{irpfPct}%</strong>
              </p>
            )}
          </div>

          <div>
            <label className={LABEL}>NIF / CIF / NIE</label>
            <input
              name="nif"
              placeholder="12345678A / B12345678"
              defaultValue={talent.nif ?? ''}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>Nombre fiscal</label>
            <input
              name="fiscalName"
              placeholder="Nombre completo o razón social"
              defaultValue={talent.fiscalName ?? ''}
              className={INPUT}
            />
          </div>

          <div className="md:col-span-2">
            <label className={LABEL}>Dirección fiscal completa</label>
            <textarea
              name="fiscalAddress"
              rows={2}
              placeholder="Calle, número, piso, CP, ciudad, provincia..."
              defaultValue={talent.fiscalAddress ?? ''}
              className={INPUT}
            />
          </div>
        </div>
      </section>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-400">Datos de compliance guardados.</p>}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
        >
          {isPending ? 'Guardando...' : 'Guardar compliance'}
        </button>
      </div>
    </form>
  );
}
