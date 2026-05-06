'use client';

import { useActionState, useEffect, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createBrandAction, updateBrandAction, deleteBrandAction } from '@/app/admin/(dashboard)/brands/crm-actions';
import { EditDrawer } from '@/features/admin/_shared/components/EditDrawer';
import {
  CRM_BRAND_TIPOS,
  CRM_BRAND_SECTORES,
  CRM_BRAND_GEOS,
  CRM_BRAND_STATUSES,
  SECTOR_LABELS,
  GEO_LABELS,
} from '@/lib/schemas/crmBrand';

import type { CrmBrandWithDerived } from '@/types';

import {
  BTN_DANGER,
  BTN_GHOST,
  BTN_PRIMARY,
  INPUT,
  LABEL,
  STATUS_LABELS,
  TIPO_LABELS,
  toDateInputValue,
} from './BrandFormDrawer.parts';

type BrandFormDrawerProps = {
  readonly brand: CrmBrandWithDerived | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly staffUsers: readonly { id: string; name: string }[];
  readonly isManager: boolean;
  readonly onSuccess: () => void;
};

/**
 * Drawer lateral con el formulario CRUD de una marca del CRM (crear, editar, eliminar).
 *
 * @kind client
 * @feature admin/brands
 * @route /admin/brands
 */
type StaffUser = { readonly id: string; readonly name: string };

function BrandResponsablesField({
  staffUsers, defaultAssigned, defaultCoAssigned, labelCls, inputCls,
}: {
  readonly staffUsers:       readonly StaffUser[];
  readonly defaultAssigned:  string;
  readonly defaultCoAssigned: string;
  readonly labelCls:         string;
  readonly inputCls:         string;
}): React.ReactElement {
  const [assignedId, setAssignedId] = useState(defaultAssigned);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelCls} htmlFor="bfd-assignedToUserId">Responsable</label>
        <select
          id="bfd-assignedToUserId"
          name="assignedToUserId"
          value={assignedId}
          onChange={(e) => setAssignedId(e.target.value)}
          className={inputCls}
        >
          <option value="">— Sin asignar —</option>
          {staffUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="bfd-coAssignedToUserId">Co-responsable</label>
        <select
          id="bfd-coAssignedToUserId"
          name="coAssignedToUserId"
          defaultValue={defaultCoAssigned}
          className={inputCls}
        >
          <option value="">— Ninguno —</option>
          {staffUsers.filter((u) => u.id !== assignedId).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function BrandFormDrawer({
  brand,
  isOpen,
  onClose,
  staffUsers,
  isManager,
  onSuccess,
}: BrandFormDrawerProps): React.ReactElement {
  const router = useRouter();
  const isEdit = brand !== null;

  const action = isEdit ? updateBrandAction : createBrandAction;
  const [state, formAction, isPending] = useActionState(action, {});
  const [isDeleting, startDeleteTransition] = useTransition();

  // On success: close drawer + refresh server data
  useEffect(() => {
    if (state.success && !isPending) {
      onClose();
      onSuccess();
      router.refresh();
    }
  }, [state.success, isPending, onClose, onSuccess, router]);

  const handleDelete = (): void => {
    if (!brand) return;
    if (!confirm(`¿Eliminar la marca "${brand.name}" y todos sus contactos? Esta acción no se puede deshacer.`)) return;
    startDeleteTransition(async () => {
      const result = await deleteBrandAction(brand.id);
      if (!result.error) {
        onClose();
        onSuccess();
        router.refresh();
      }
    });
  };

  const title = isEdit ? `Editar: ${brand.name}` : 'Nueva marca';

  const footer = (
    <>
      {!isManager && isEdit && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={BTN_DANGER}
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar marca'}
        </button>
      )}
      <div className="flex-1" />
      <button type="button" onClick={onClose} className={BTN_GHOST}>
        Cancelar
      </button>
      <button
        type="submit"
        form="brand-form-drawer"
        disabled={isPending}
        className={BTN_PRIMARY}
      >
        {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear marca'}
      </button>
    </>
  );

  return (
    <EditDrawer isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <form id="brand-form-drawer" action={formAction} className="space-y-5">
        {isEdit && <input type="hidden" name="id" value={brand.id} />}

        {/* Marca + Manager */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="bfd-name">Marca *</label>
            <input
              id="bfd-name"
              name="name"
              required
              maxLength={200}
              defaultValue={brand?.name ?? ''}
              className={INPUT}
              placeholder="Nombre comercial de la marca"
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="bfd-manager">Manager(s)</label>
            <textarea
              id="bfd-manager"
              name="manager"
              rows={2}
              maxLength={250}
              defaultValue={brand?.manager ?? ''}
              className={`${INPUT} resize-none`}
              placeholder={"Manager 1\nManager 2"}
            />
          </div>
        </div>

        {/* Web */}
        <div>
          <label className={LABEL} htmlFor="bfd-website">Sitio web</label>
          <input
            id="bfd-website"
            name="website"
            type="url"
            defaultValue={brand?.website ?? ''}
            className={INPUT}
            placeholder="https://..."
          />
        </div>

        {/* Tipo + Sector */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="bfd-tipo">Tipo</label>
            <select
              id="bfd-tipo"
              name="tipo"
              defaultValue={brand?.tipo ?? ''}
              className={INPUT}
            >
              <option value="">— Sin especificar —</option>
              {CRM_BRAND_TIPOS.map((t) => (
                <option key={t} value={t}>{TIPO_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="bfd-sector">Sector</label>
            <select
              id="bfd-sector"
              name="sector"
              defaultValue={brand?.sector ?? ''}
              className={INPUT}
            >
              <option value="">— Sin especificar —</option>
              {CRM_BRAND_SECTORES.map((s) => (
                <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Geo + País */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="bfd-geo">Geo</label>
            <select
              id="bfd-geo"
              name="geo"
              defaultValue={brand?.geo ?? ''}
              className={INPUT}
            >
              <option value="">— Sin especificar —</option>
              {CRM_BRAND_GEOS.map((g) => (
                <option key={g} value={g}>{GEO_LABELS[g]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="bfd-country">País / Entidad</label>
            <input
              id="bfd-country"
              name="country"
              maxLength={2}
              defaultValue={brand?.country ?? ''}
              className={INPUT}
              placeholder="ES"
            />
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className={LABEL} htmlFor="bfd-status">Estado</label>
          <select
            id="bfd-status"
            name="status"
            defaultValue={brand?.status ?? 'lead'}
            className={INPUT}
          >
            {CRM_BRAND_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Último contacto + Próximo follow-up */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="bfd-lastContactAt">Último contacto</label>
            <input
              id="bfd-lastContactAt"
              name="lastContactAt"
              type="date"
              defaultValue={toDateInputValue(brand?.lastContactAt)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="bfd-nextFollowupAt">Próximo follow-up</label>
            <input
              id="bfd-nextFollowupAt"
              name="nextFollowupAt"
              type="date"
              defaultValue={toDateInputValue(brand?.nextFollowupAt)}
              className={INPUT}
            />
          </div>
        </div>

        {/* Responsable + Co-responsable */}
        {staffUsers.length > 0 && (
          <BrandResponsablesField
            staffUsers={staffUsers}
            defaultAssigned={brand?.assignedToUserId ?? ''}
            defaultCoAssigned={brand?.coAssignedToUserId ?? ''}
            labelCls={LABEL}
            inputCls={INPUT}
          />
        )}

        {/* Contactos rápidos del manager */}
        <div className="border-t border-sp-admin-border/50 pt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">
            Contacto del manager
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={LABEL} htmlFor="bfd-discord">Discord</label>
              <input
                id="bfd-discord"
                name="discord"
                maxLength={80}
                defaultValue={brand?.discord ?? ''}
                className={INPUT}
                placeholder="usuario#0000"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="bfd-telegram">Telegram</label>
              <input
                id="bfd-telegram"
                name="telegram"
                maxLength={80}
                defaultValue={brand?.telegram ?? ''}
                className={INPUT}
                placeholder="@usuario"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="bfd-whatsapp">WhatsApp</label>
              <input
                id="bfd-whatsapp"
                name="whatsapp"
                maxLength={40}
                defaultValue={brand?.whatsapp ?? ''}
                className={INPUT}
                placeholder="+34 …"
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className={LABEL} htmlFor="bfd-notes">Notas internas</label>
          <textarea
            id="bfd-notes"
            name="notes"
            rows={4}
            defaultValue={brand?.notes ?? ''}
            className={`${INPUT} resize-none`}
            placeholder="Notas internas sobre esta marca..."
          />
        </div>

        {/* Rate cards & workspace defaults */}
        <div className="border-t border-sp-admin-border/50 pt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">
            Workspace / Tarifas
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="bfd-rate-nano">Tarifa Nano (€)</label>
              <input
                id="bfd-rate-nano"
                name="defaultRateCard[nano]"
                type="number"
                min="0"
                step="50"
                defaultValue={brand?.defaultRateCard?.nano ?? ''}
                className={INPUT}
                placeholder="0"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="bfd-rate-micro">Tarifa Micro (€)</label>
              <input
                id="bfd-rate-micro"
                name="defaultRateCard[micro]"
                type="number"
                min="0"
                step="50"
                defaultValue={brand?.defaultRateCard?.micro ?? ''}
                className={INPUT}
                placeholder="0"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="bfd-rate-macro">Tarifa Macro (€)</label>
              <input
                id="bfd-rate-macro"
                name="defaultRateCard[macro]"
                type="number"
                min="0"
                step="50"
                defaultValue={brand?.defaultRateCard?.macro ?? ''}
                className={INPUT}
                placeholder="0"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="bfd-rate-mega">Tarifa Mega (€)</label>
              <input
                id="bfd-rate-mega"
                name="defaultRateCard[mega]"
                type="number"
                min="0"
                step="50"
                defaultValue={brand?.defaultRateCard?.mega ?? ''}
                className={INPUT}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={LABEL} htmlFor="bfd-agency-fee">Fee agencia (%)</label>
              <input
                id="bfd-agency-fee"
                name="agencyFeePct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                defaultValue={brand?.agencyFeePct ?? ''}
                className={INPUT}
                placeholder="20"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="bfd-payment-terms">Días de pago</label>
              <input
                id="bfd-payment-terms"
                name="paymentTermsDays"
                type="number"
                min="0"
                step="1"
                defaultValue={brand?.paymentTermsDays ?? ''}
                className={INPUT}
                placeholder="30"
              />
            </div>
          </div>
        </div>

        {/* Datos fiscales */}
        <div className="border-t border-sp-admin-border/50 pt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">
            Datos fiscales
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="bfd-nif">NIF / CIF</label>
              <input
                id="bfd-nif"
                name="nif"
                maxLength={30}
                defaultValue={brand?.nif ?? ''}
                className={INPUT}
                placeholder="B12345678"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="bfd-billing-email">Email facturación</label>
              <input
                id="bfd-billing-email"
                name="billingEmail"
                type="email"
                defaultValue={brand?.billingEmail ?? ''}
                className={INPUT}
                placeholder="billing@marca.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="bfd-fiscal-name">Nombre fiscal</label>
              <input
                id="bfd-fiscal-name"
                name="fiscalName"
                maxLength={250}
                defaultValue={brand?.fiscalName ?? ''}
                className={INPUT}
                placeholder="Razón social legal completa"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {state.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {state.error}
          </p>
        )}
      </form>
    </EditDrawer>
  );
}
