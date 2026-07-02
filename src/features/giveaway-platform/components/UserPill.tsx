'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  userName: string | null;
  balance: number;
  loggedIn: boolean;
}

/**
 * Pill visual con avatar + nombre + saldo + dropdown.
 * PR1 no engancha acciones reales (Steam login, logout, navegación de perfil).
 * Los ítems del menú se marcan con `data-todo` para el swap de PR3.
 */
export function UserPill({ userName, balance, loggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  if (!loggedIn) {
    return (
      <button
        type="button"
        className="gp-btn"
        style={{
          padding: '10px 18px',
          background: 'linear-gradient(90deg, var(--pink), #b44df0 40%, var(--cyan))',
        }}
        data-todo="steam-login"
      >
        🎮 Iniciar sesión
      </button>
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
        <button type="button" role="menuitem" className="gp-um-item exit" data-todo="logout">
          <span className="i" aria-hidden>🚪</span>
          <span>
            <b>Cerrar sesión</b>
          </span>
        </button>
      </div>
    </div>
  );
}
