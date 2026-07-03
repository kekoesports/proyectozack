'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { steamLogout } from '@/features/giveaway-platform/actions/steamLogout';
import { SteamAvatar } from './SteamAvatar';
import { SteamLoginButton } from './SteamLoginButton';

interface Props {
  userName: string | null;
  userImage: string | null;
  balance: number;
  loggedIn: boolean;
}

/**
 * Pill visual con avatar + nombre + saldo + dropdown.
 * Login = anchor a /api/auth/steam/login (redirect OpenID a Steam).
 * Logout = server action que llama a auth.api.signOut y redirige.
 * Perfil/Inventario/Transacciones siguen marcados como `data-todo` — PR3.
 */
export function UserPill({ userName, userImage, balance, loggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function handleLogout() {
    setOpen(false);
    startTransition(() => {
      void steamLogout();
    });
  }

  if (!loggedIn) {
    // Botón dedicado con SVG del logo Steam + copy premium en 2 líneas.
    // El propio SteamLoginButton usa <a> nativo (el href es una API route
    // que devuelve 302, no una page de Next).
    return <SteamLoginButton size="md" />;
  }

  return (
    <div ref={ref} className={`gp-user-wrap${open ? ' open' : ''}`}>
      <button type="button" className="gp-user-pill" onClick={() => setOpen((v) => !v)}>
        <SteamAvatar imageUrl={userImage} name={userName} size={26} className="gp-avatar" />
        <span className="gp-user-name">{userName ?? 'Jugador'}</span>
        <span className="gp-balance">
          <span>{balance.toLocaleString('es-ES')}</span>
          <span className="coin" aria-hidden>🪙</span>
        </span>
        <span className="gp-chev" aria-hidden>▾</span>
      </button>
      <div className="gp-user-menu" role="menu">
        <Link href="/sorteos/perfil" role="menuitem" className="gp-um-item" onClick={() => setOpen(false)}>
          <span className="i" aria-hidden>⚙️</span>
          <span>
            <b>Mi perfil</b>
            <span>Ajustes, inventario y saldo</span>
          </span>
        </Link>
        <Link href="/sorteos/perfil#inventario" role="menuitem" className="gp-um-item" onClick={() => setOpen(false)}>
          <span className="i" aria-hidden>🎒</span>
          <span>
            <b>Inventario</b>
            <span>Ver tu historial de premios</span>
          </span>
        </Link>
        <Link href="/sorteos/perfil#transacciones" role="menuitem" className="gp-um-item" onClick={() => setOpen(false)}>
          <span className="i" aria-hidden>🧾</span>
          <span>
            <b>Transacciones</b>
            <span>Revisa tu historial de monedas</span>
          </span>
        </Link>
        <button
          type="button"
          role="menuitem"
          className="gp-um-item exit"
          onClick={handleLogout}
          disabled={isPending}
        >
          <span className="i" aria-hidden>🚪</span>
          <span>
            <b>{isPending ? 'Cerrando…' : 'Cerrar sesión'}</b>
          </span>
        </button>
      </div>
    </div>
  );
}
