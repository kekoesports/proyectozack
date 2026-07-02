'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { steamLogout } from '@/features/giveaway-platform/actions/steamLogout';

interface Props {
  userName: string | null;
  balance: number;
  loggedIn: boolean;
}

/**
 * Pill visual con avatar + nombre + saldo + dropdown.
 * Login = anchor a /api/auth/steam/login (redirect OpenID a Steam).
 * Logout = server action que llama a auth.api.signOut y redirige.
 * Perfil/Inventario/Transacciones siguen marcados como `data-todo` — PR3.
 */
export function UserPill({ userName, balance, loggedIn }: Props) {
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
    // Ruta API que devuelve 302 al OpenID de Steam. No es una page → no
    // podemos usar <Link>, que asume client-side navigation entre rutas de
    // la app. Con <a> nativo el navegador sigue el redirect al dominio de
    // Steam correctamente.
    return (
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      <a
        href="/api/auth/steam/login"
        className="gp-btn"
        style={{
          padding: '10px 18px',
          background: 'var(--sp-grad)',
          textDecoration: 'none',
        }}
      >
        🎮 Iniciar sesión con Steam
      </a>
    );
  }

  return (
    <div ref={ref} className={`gp-user-wrap${open ? ' open' : ''}`}>
      <button type="button" className="gp-user-pill" onClick={() => setOpen((v) => !v)}>
        <span className="gp-avatar" aria-hidden>🐱</span>
        <span className="gp-user-name">{userName ?? 'Jugador'}</span>
        <span className="gp-balance">
          <span>{balance.toLocaleString('es-ES')}</span>
          <span className="coin" aria-hidden>🪙</span>
        </span>
        <span className="gp-chev" aria-hidden>▾</span>
      </button>
      <div className="gp-user-menu" role="menu">
        <Link
          role="menuitem"
          className="gp-um-item"
          href="/sorteos/plataforma/perfil"
          onClick={() => setOpen(false)}
        >
          <span className="i" aria-hidden>👤</span>
          <span>
            <b>Mi perfil</b>
            <span>Cuentas conectadas y ajustes</span>
          </span>
        </Link>
        <button type="button" role="menuitem" className="gp-um-item" data-todo="profile-config">
          <span className="i" aria-hidden>⚙️</span>
          <span>
            <b>Configuración</b>
            <span>Ajusta tu perfil</span>
          </span>
        </button>
        <button type="button" role="menuitem" className="gp-um-item" data-todo="profile-inv">
          <span className="i" aria-hidden>🎒</span>
          <span>
            <b>Inventario</b>
            <span>Ver tu historial de premios</span>
          </span>
        </button>
        <button type="button" role="menuitem" className="gp-um-item" data-todo="profile-tx">
          <span className="i" aria-hidden>🧾</span>
          <span>
            <b>Transacciones</b>
            <span>Revisa tu historial de monedas</span>
          </span>
        </button>
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
