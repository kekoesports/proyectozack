'use client';

import { useActionState, useState } from 'react';
import { createBankAccountAction } from './actions';

type State = { readonly error?: string; readonly success?: boolean; readonly id?: number };
const init: State = {};

export function BankAccountForm(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createBankAccountAction, init);

  if (state.success && open) setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sp-orange/10 text-sp-orange hover:bg-sp-orange/20 transition-colors"
      >
        + Nueva cuenta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-sp-admin-card shadow-2xl border border-sp-border">
            <div className="px-5 py-4 border-b border-sp-border flex items-center justify-between">
              <h2 className="text-sm font-bold">Nueva cuenta bancaria</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sp-admin-muted hover:text-sp-admin-fg text-lg leading-none">×</button>
            </div>
            <form action={formAction} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-sp-admin-muted mb-1">Nombre *</label>
                <input name="displayName" required maxLength={200} placeholder="Ej: Cuenta corriente principal" className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-sp-admin-muted mb-1">Proveedor</label>
                  <select name="provider" className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/40">
                    <option value="manual">Manual</option>
                    <option value="bank">Banco</option>
                    <option value="wise">Wise</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sp-admin-muted mb-1">Moneda</label>
                  <input name="currency" defaultValue="EUR" maxLength={3} placeholder="EUR" className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/40" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-sp-admin-muted mb-1">Banco</label>
                <input name="bankName" maxLength={200} placeholder="Ej: Santander" className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sp-admin-muted mb-1">IBAN (enmascarado)</label>
                <input name="ibanMasked" maxLength={40} placeholder="ES** **** **** **** **** ****" className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sp-orange/40" />
              </div>
              {state.error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 text-sm font-semibold rounded-lg border border-sp-border hover:bg-sp-admin-bg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={pending} className="flex-1 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors">
                  {pending ? 'Guardando…' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
