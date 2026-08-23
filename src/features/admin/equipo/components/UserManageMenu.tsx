'use client';

import { useState, useTransition } from 'react';
import {
  removeUserAction,
  resetStaffPasswordAction,
  updateUserRoleAction,
} from '@/app/admin/(dashboard)/equipo/actions';

type Props = {
  readonly userId: string;
  readonly currentRole: string;
};

const ROLE_OPTIONS = [
  { value: 'admin',   label: 'Admin',   desc: 'Acceso total + eliminar' },
  { value: 'manager', label: 'Manager', desc: 'Acceso total, sin eliminar' },
  { value: 'staff',   label: 'Staff',   desc: 'Solo sus tareas y marcas' },
] as const;

export function UserManageMenu({ userId, currentRole }: Props): React.ReactElement {
  const [open,        setOpen]        = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [resetOpen,   setResetOpen]   = useState(false);
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState<string | null>(null);
  const [isPending,   startTransition] = useTransition();

  const handleRoleChange = (role: string): void => {
    if (role === currentRole) { setOpen(false); return; }
    setError(null);
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, role);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  };

  const handleDelete = (): void => {
    setError(null);
    startTransition(async () => {
      const res = await removeUserAction(userId);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  };

  const handlePasswordReset = (): void => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await resetStaffPasswordAction(userId, password, confirm);
      if (res.error) {
        setError(res.error);
        return;
      }
      setPassword('');
      setConfirm('');
      setResetOpen(false);
      setSuccess('Contraseña actualizada; sesiones cerradas');
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setConfirmDel(false);
          setResetOpen(false);
          setError(null);
          setSuccess(null);
        }}
        className="flex items-center justify-center w-6 h-6 rounded-md text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer"
        title="Gestionar usuario"
        aria-label="Gestionar usuario"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
          <circle cx="7" cy="2.5" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 w-52 bg-sp-admin-card border border-sp-admin-border rounded-xl shadow-2xl z-50 overflow-hidden">

            {/* Cambiar rol */}
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sp-admin-muted">Cambiar rol</p>
            </div>
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isPending}
                onClick={() => handleRoleChange(opt.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer disabled:opacity-50 ${
                  currentRole === opt.value
                    ? 'bg-sp-admin-accent/8 text-sp-admin-accent'
                    : 'hover:bg-sp-admin-hover text-sp-admin-text'
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold">{opt.label}</span>
                  <span className="block text-[10px] text-sp-admin-muted">{opt.desc}</span>
                </span>
                {currentRole === opt.value && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <polyline points="2,6 5,9 10,3"/>
                  </svg>
                )}
              </button>
            ))}

            <div className="border-t border-sp-admin-border/60 mt-1" />

            {!resetOpen ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setResetOpen(true);
                  setConfirmDel(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                  <rect x="2" y="5" width="8" height="5.5" rx="1" />
                  <path d="M4 5V3.5a2 2 0 0 1 4 0V5" />
                  <circle cx="6" cy="7.7" r=".7" fill="currentColor" stroke="none" />
                </svg>
                Restablecer contraseña
              </button>
            ) : (
              <div className="px-3 py-3 space-y-2 border-b border-sp-admin-border/60">
                <p className="text-[10px] text-sp-admin-muted leading-snug">
                  No necesita la contraseña anterior. Se cerrarán sus sesiones activas.
                </p>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nueva contraseña (12+)"
                  aria-label="Nueva contraseña"
                  className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-2.5 py-2 text-[11px] text-sp-admin-text outline-none focus:border-sp-admin-accent"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repetir contraseña"
                  aria-label="Repetir contraseña"
                  className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-2.5 py-2 text-[11px] text-sp-admin-text outline-none focus:border-sp-admin-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending || password.length < 12 || confirm.length < 12}
                    onClick={handlePasswordReset}
                    className="flex-1 py-1.5 rounded-lg bg-sp-admin-accent text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer transition-opacity"
                  >
                    {isPending ? 'Actualizando…' : 'Actualizar'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setResetOpen(false);
                      setPassword('');
                      setConfirm('');
                      setError(null);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-sp-admin-hover text-sp-admin-text text-[11px] font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Eliminar */}
            {!confirmDel ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmDel(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                  <polyline points="2,3 10,3"/><path d="M4 3V2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1"/><rect x="2.5" y="3" width="7" height="7.5" rx="1"/>
                  <line x1="5" y1="5.5" x2="5" y2="8.5"/><line x1="7" y1="5.5" x2="7" y2="8.5"/>
                </svg>
                Eliminar usuario
              </button>
            ) : (
              <div className="px-3 py-2.5 space-y-2">
                <p className="text-[11px] text-red-500 font-semibold">¿Seguro? Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleDelete}
                    className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isPending ? '…' : 'Eliminar'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmDel(false)}
                    className="flex-1 py-1.5 rounded-lg bg-sp-admin-hover text-sp-admin-text text-[11px] font-semibold hover:bg-sp-admin-border cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="px-3 pb-2 text-[10px] text-red-500">{error}</p>
            )}
            {success && (
              <p className="px-3 pb-2 text-[10px] text-emerald-600">{success}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
