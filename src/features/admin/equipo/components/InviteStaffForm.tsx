'use client';

import { useActionState } from 'react';
import { inviteStaffAction } from '@/app/admin/(dashboard)/equipo/actions';

const ROLE_OPTIONS = [
  { value: 'staff',   label: 'Staff',   desc: 'Solo sus tareas y marcas' },
  { value: 'manager', label: 'Manager', desc: 'Acceso total, sin eliminar' },
  { value: 'admin',   label: 'Admin',   desc: 'Acceso total + eliminar' },
] as const;

/**
 * Formulario para invitar un nuevo trabajador al panel. Solo accesible a admins.
 * Permite seleccionar el rol inicial (staff por defecto).
 */
export function InviteStaffForm(): React.ReactElement {
  const [state, formAction, isPending] = useActionState(inviteStaffAction, {});

  const inputCls = 'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-4 py-2.5 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';

  return (
    <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6">
      <h2 className="font-bold text-sp-admin-text mb-4">Invitar trabajador</h2>
      <form action={formAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Nombre</label>
          <input name="name" required className={inputCls} placeholder="Ej: Pablo Camacho" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Email</label>
          <input name="email" type="email" required className={inputCls} placeholder="pablo@socialpro.es" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-admin-muted mb-1.5">Rol</label>
          <select name="role" defaultValue="staff" className={inputCls}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-[42px] px-6 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 shrink-0 disabled:opacity-60 transition-opacity cursor-pointer"
        >
          {isPending ? 'Invitando…' : 'Invitar'}
        </button>
      </form>
      {state.error   && <p className="text-xs text-red-400 mt-2">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-400 mt-2">Invitación enviada. El usuario recibirá un email para establecer su contraseña.</p>}
    </div>
  );
}
