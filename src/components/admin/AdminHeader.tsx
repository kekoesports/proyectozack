'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchIcon, BellIcon } from './SidebarIcons';

const QUICK_ACTIONS = [
  { label: 'Nueva tarea',    href: '/admin/tareas',      emoji: '✓' },
  { label: 'Nueva marca',    href: '/admin/brands',      emoji: '🏢' },
  { label: 'Nueva factura',  href: '/admin/facturacion', emoji: '€'  },
  { label: 'Nuevo talento',  href: '/admin/talents',     emoji: '⭐' },
] as const;

export function AdminHeader(): React.ReactElement {
  const [showActions, setShowActions] = useState(false);

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 h-14 bg-sp-admin-bg/95 backdrop-blur-md border-b border-sp-admin-border/70 flex items-center gap-3 px-4 md:px-6">
      {/* Fecha */}
      <span className="hidden md:block text-[11px] font-medium text-sp-admin-muted capitalize shrink-0 tabular-nums">
        {today}
      </span>
      <div className="hidden md:block h-4 w-px bg-sp-admin-border shrink-0" aria-hidden />

      {/* Buscador */}
      <div className="relative flex-1 max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sp-admin-muted pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="search"
          placeholder="Buscar marcas, talentos, campañas…"
          className="w-full h-8 pl-8 pr-3 rounded-lg bg-white border border-sp-admin-border text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/40 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          aria-label="Buscar"
        />
      </div>

      {/* Acciones derechas */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Acciones rápidas */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 active:scale-95 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Acciones rápidas
          </button>

          {showActions && (
            <>
              {/* Backdrop */}
              <button
                type="button"
                className="fixed inset-0 z-10"
                aria-label="Cerrar"
                onClick={() => setShowActions(false)}
              />
              {/* Dropdown */}
              <div className="absolute right-0 top-10 z-20 w-48 bg-white rounded-xl border border-sp-admin-border shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                <div className="px-3 py-2 border-b border-sp-admin-border/60">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                    Acciones rápidas
                  </p>
                </div>
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    prefetch={false}
                    onClick={() => setShowActions(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
                  >
                    <span className="text-base leading-none">{action.emoji}</span>
                    {action.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notificaciones */}
        <button
          type="button"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          aria-label="Notificaciones"
        >
          <span className="w-4 h-4 block"><BellIcon /></span>
        </button>
      </div>
    </header>
  );
}
