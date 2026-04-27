'use client';

import { useActionState } from 'react';
import { inviteBrandAction } from '@/app/admin/(dashboard)/brands/actions';

/**
 * Formulario para invitar a un usuario al portal de marcas (envía email con link de alta).
 *
 * @kind client
 * @feature admin/brands
 * @route /admin/brands
 */
export function InviteBrandForm(): React.ReactElement {
  const [state, formAction, isPending] = useActionState(inviteBrandAction, {});

  return (
    <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8">
      <h2 className="font-bold text-sp-admin-text mb-4">Invitar marca</h2>
      <form action={formAction} className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Nombre</label>
          <input name="name" required className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-4 py-2.5 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Email</label>
          <input name="email" type="email" required className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-4 py-2.5 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors" />
        </div>
        <button type="submit" disabled={isPending} className="px-6 py-2.5 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 shrink-0 disabled:opacity-60 transition-opacity">
          {isPending ? 'Invitando...' : 'Invitar'}
        </button>
      </form>
      {state.error && <p className="text-xs text-red-400 mt-2">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-400 mt-2">Invitación enviada correctamente.</p>}
    </div>
  );
}
