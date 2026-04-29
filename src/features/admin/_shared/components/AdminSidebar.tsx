'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronDownIcon, MoreIcon, LogoutIcon } from './SidebarIcons';

type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly prefetch?: boolean;
};

export type NavGroup = {
  readonly key: string;
  readonly label: string;
  readonly items: readonly NavItem[];
};

type AdminSidebarProps = {
  readonly primaryNav: readonly NavItem[];
  readonly groups?: readonly NavGroup[];
  readonly moreNav: readonly NavItem[];
  readonly userName: string;
  readonly userRole: string;
  readonly userEmail: string;
  readonly logoutHref: string;
};

/**
 * Sidebar de navegación del admin con grupos (CRM/Operaciones/Finanzas/Más), menú móvil y bloque de usuario con logout.
 *
 * @kind client
 * @feature admin/_shared
 * @example
 * ```tsx
 * <AdminSidebar
 *   primaryNav={primaryNav}
 *   groups={groups}
 *   moreNav={moreNav}
 *   userName="Zack"
 *   userRole="admin"
 *   userEmail="zack@socialpro.es"
 *   logoutHref="/api/auth/logout"
 * />
 * ```
 */
export function AdminSidebar({
  primaryNav,
  groups,
  moreNav,
  userName,
  userRole,
  userEmail,
  logoutHref,
}: AdminSidebarProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === href;
    return pathname.startsWith(href);
  }

  const displayName = userName || userEmail;
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : '';
  const moreActive = moreNav.some((item) => isActive(item.href));
  const expanded = moreOpen || moreActive;

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b bg-sp-admin-sidebar border-sp-admin-border">
        <Link href="/admin" className="flex items-center gap-2" aria-label="SocialPro CRM">
          <span className="w-7 h-7 rounded-md bg-sp-grad flex items-center justify-center font-display text-[11px] font-black text-white">SP</span>
          <span className="font-display text-[13px] font-black uppercase text-sp-admin-text">SocialPro CRM</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
          className="p-2 rounded-md text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open
              ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              : <><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></>
            }
          </svg>
        </button>
      </div>

      {/* ── Backdrop ─────────────────────────────────────────── */}
      {open && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Cerrar menu"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <nav className={[
        'fixed md:sticky z-50 top-0 left-0 md:h-screen h-full flex flex-col shrink-0',
        'transition-transform duration-200 ease-out',
        'w-60',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        'bg-sp-admin-sidebar border-r border-sp-admin-border',
      ].join(' ')}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 shrink-0 border-b border-sp-admin-border">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="SocialPro CRM"
          >
            <span className="w-8 h-8 rounded-lg bg-sp-grad flex items-center justify-center font-display text-xs font-black text-white">
              SP
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-[13px] font-black uppercase tracking-wide text-sp-admin-text">SocialPro CRM</span>
              <span className="text-[9px] uppercase tracking-[0.15em] text-sp-admin-muted">Panel admin</span>
            </span>
          </Link>
        </div>

        {/* Nav items */}
        <div className="flex-1 flex flex-col gap-0.5 py-3 px-3 overflow-y-auto">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClose={() => setOpen(false)}
            />
          ))}

          {groups && groups.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {groups.map((group) => (
                <div key={group.key} className="flex flex-col gap-0.5">
                  <h3 className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted/80">
                    {group.label}
                  </h3>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {moreNav.length > 0 && (
            <div className="mt-2 pt-2 border-t border-sp-admin-border">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={expanded}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  moreActive
                    ? 'text-sp-admin-text'
                    : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover',
                ].join(' ')}
              >
                <span className="w-5 h-5 shrink-0"><MoreIcon /></span>
                <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.15em]">Más</span>
                <span className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                  <ChevronDownIcon />
                </span>
              </button>
              {expanded && (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {moreNav.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      onClose={() => setOpen(false)}
                      indent
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — user card */}
        <div className="shrink-0 border-t border-sp-admin-border p-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full bg-sp-admin-hover flex items-center justify-center text-[11px] font-bold text-sp-admin-text shrink-0"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-sp-admin-text truncate" title={displayName}>
                {displayName}
              </div>
              {roleLabel && (
                <div className="text-[10px] text-sp-admin-muted uppercase tracking-wider">
                  {roleLabel}
                </div>
              )}
            </div>
            <Link
              href={logoutHref}
              className="p-1.5 rounded-md text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <span className="w-4 h-4 block"><LogoutIcon /></span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

type NavLinkProps = {
  readonly item: NavItem;
  readonly active: boolean;
  readonly onClose: () => void;
  readonly indent?: boolean;
};

function NavLink({ item, active, onClose, indent = false }: NavLinkProps): React.ReactElement {
  const prefetch = item.prefetch ?? null;
  return (
    <Link
      href={item.href}
      prefetch={prefetch}
      onClick={onClose}
      className={[
        'relative flex items-center gap-3 py-2 rounded-lg transition-colors text-[13px] font-medium',
        indent ? 'pl-10 pr-3' : 'px-3',
        active
          ? 'text-sp-admin-accent bg-sp-admin-accent/10'
          : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover',
      ].join(' ')}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-sp-admin-accent" />
      )}
      <span className="w-5 h-5 shrink-0">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}
