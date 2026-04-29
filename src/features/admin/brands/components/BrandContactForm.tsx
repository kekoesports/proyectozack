'use client';

import { useActionState, useEffect } from 'react';

import {
  createContactAction,
  updateContactAction,
} from '@/app/admin/(dashboard)/brands/crm-actions';

import type { CrmBrandContact } from '@/types';

type BrandContactFormProps = {
  readonly brandId: number;
  readonly contact: CrmBrandContact | null;
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

/**
 * Formulario de creación/edición de contactos asociados a una marca del CRM.
 *
 * @kind client
 * @feature admin/brands
 * @route /admin/brands
 */
export function BrandContactForm({
  brandId,
  contact,
  onSuccess,
  onCancel,
}: BrandContactFormProps): React.ReactElement {
  const isEdit = contact !== null;
  const action = isEdit ? updateContactAction : createContactAction;
  const [state, formAction, isPending] = useActionState(action, {});

  useEffect(() => {
    if (state.success && !isPending) {
      onSuccess();
    }
  }, [state.success, isPending, onSuccess]);

  const uid = contact?.id ?? 'new';

  return (
    <form
      action={formAction}
      className="rounded-xl bg-sp-admin-bg border border-sp-admin-border p-4 space-y-4"
    >
      <input type="hidden" name="brandId" value={brandId} />
      {isEdit && <input type="hidden" name="id" value={contact.id} />}

      {/* Nombre + Cargo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor={`bcf-name-${uid}`}>
            Nombre *
          </label>
          <input
            id={`bcf-name-${uid}`}
            name="name"
            required
            maxLength={150}
            defaultValue={contact?.name ?? ''}
            className={INPUT}
            placeholder="Nombre del contacto"
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`bcf-role-${uid}`}>
            Cargo
          </label>
          <input
            id={`bcf-role-${uid}`}
            name="role"
            maxLength={100}
            defaultValue={contact?.role ?? ''}
            className={INPUT}
            placeholder="Marketing Manager"
          />
        </div>
      </div>

      {/* Email + Teléfono */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor={`bcf-email-${uid}`}>
            Email
          </label>
          <input
            id={`bcf-email-${uid}`}
            name="email"
            type="email"
            maxLength={180}
            defaultValue={contact?.email ?? ''}
            className={INPUT}
            placeholder="contacto@marca.com"
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`bcf-phone-${uid}`}>
            Teléfono
          </label>
          <input
            id={`bcf-phone-${uid}`}
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={contact?.phone ?? ''}
            className={INPUT}
            placeholder="+34 600 000 000"
          />
        </div>
      </div>

      {/* Telegram + Discord */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor={`bcf-telegram-${uid}`}>
            Telegram
          </label>
          <input
            id={`bcf-telegram-${uid}`}
            name="telegram"
            maxLength={80}
            defaultValue={contact?.telegram ?? ''}
            className={INPUT}
            placeholder="@usuario"
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`bcf-discord-${uid}`}>
            Discord
          </label>
          <input
            id={`bcf-discord-${uid}`}
            name="discord"
            maxLength={80}
            defaultValue={contact?.discord ?? ''}
            className={INPUT}
            placeholder="usuario#0000"
          />
        </div>
      </div>

      {/* WhatsApp + LinkedIn */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor={`bcf-whatsapp-${uid}`}>
            WhatsApp
          </label>
          <input
            id={`bcf-whatsapp-${uid}`}
            name="whatsapp"
            maxLength={40}
            defaultValue={contact?.whatsapp ?? ''}
            className={INPUT}
            placeholder="+34 600 000 000"
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`bcf-linkedin-${uid}`}>
            LinkedIn
          </label>
          <input
            id={`bcf-linkedin-${uid}`}
            name="linkedin"
            maxLength={200}
            defaultValue={contact?.linkedin ?? ''}
            className={INPUT}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
      </div>

      {/* País + Contacto principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor={`bcf-country-${uid}`}>
            País (2 letras)
          </label>
          <input
            id={`bcf-country-${uid}`}
            name="country"
            maxLength={2}
            defaultValue={contact?.country ?? ''}
            className={INPUT}
            placeholder="ES"
          />
        </div>
        <div className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            name="isPrimary"
            id={`bcf-primary-${uid}`}
            defaultChecked={contact?.isPrimary ?? false}
            value="true"
            className="rounded border-sp-admin-border accent-sp-admin-accent"
          />
          <label
            htmlFor={`bcf-primary-${uid}`}
            className="text-xs text-sp-admin-muted cursor-pointer select-none"
          >
            Marcar como contacto principal
          </label>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className={LABEL} htmlFor={`bcf-notes-${uid}`}>
          Notas
        </label>
        <textarea
          id={`bcf-notes-${uid}`}
          name="notes"
          rows={3}
          defaultValue={contact?.notes ?? ''}
          className={`${INPUT} resize-none`}
          placeholder="Notas internas sobre este contacto..."
        />
      </div>

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
          {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Añadir contacto'}
        </button>
      </div>
    </form>
  );
}
