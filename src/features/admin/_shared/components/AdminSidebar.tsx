'use client';

import { useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

// ── SidebarHero ──────────────────────────────────────────────────────

type SidebarHeroProps = { readonly onClick: () => void };

function SidebarHero({ onClick }: SidebarHeroProps): React.ReactElement {
  return (
    <Link
      href="/admin"
      onClick={onClick}
      className="flex flex-col gap-4 px-4 py-3 shrink-0"
      aria-label="SocialPro CRM"
    >
      <Image
        src="/images/logos/logo-full.png"
        alt="SocialPro"
        width={100}
        height={56}
        className="h-7 w-auto object-contain brightness-0 invert opacity-85"
      />
      <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-sp-admin-sidebar-muted leading-none pl-0.5">
        Panel de gestión
      </span>
    </Link>
  );
}

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
  const router = useRouter();

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === href;
    return pathname.startsWith(href);
  }

  const close = useCallback(() => setOpen(false), []);

  const displayName = userName || userEmail;
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : '';
  const moreActive = moreNav.some((item) => isActive(item.href));
  const expanded = moreOpen || moreActive;

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b border-sp-admin-sidebar-border"
        style={{ background: '#0c0c14' }}
      >
        <Link href="/admin" className="flex items-center gap-2.5" aria-label="SocialPro CRM">
          <Image
            src="/images/logos/logo-full.png"
            alt="SocialPro"
            width={100}
            height={56}
            className="h-7 w-auto object-contain brightness-0 invert opacity-85"
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
          className="p-2 rounded-lg text-sp-admin-sidebar-muted hover:text-sp-admin-sidebar-text hover:bg-sp-admin-sidebar-hover transition-colors"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          aria-label="Cerrar menu"
          onClick={close}
          onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <nav
        className={[
          'fixed md:sticky z-50 top-0 left-0 md:h-screen h-full flex flex-col shrink-0',
          'transition-transform duration-200 ease-out',
          'w-64',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'bg-sp-admin-sidebar border-r border-sp-admin-sidebar-border',
        ].join(' ')}
      >
        {/* Logo hero */}
        <SidebarHero onClick={close} />

        {/* Nav items */}
        <div className="flex-1 flex flex-col gap-0.5 py-4 px-3 overflow-y-auto">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClose={close}
            />
          ))}

          {groups && groups.length > 0 && (
            <div className="mt-1 flex flex-col gap-0">
              {groups.map((group) => (
                <div key={group.key} className="flex flex-col gap-0.5 mt-3">
                  <div className="flex items-center gap-2 px-3 mb-0.5">
                    <span className="flex-1 h-px bg-sp-admin-sidebar-border/50" />
                    <h3 className="text-[9px] font-bold uppercase tracking-[0.25em] text-sp-admin-sidebar-muted/70 shrink-0">
                      {group.label}
                    </h3>
                    <span className="flex-1 h-px bg-sp-admin-sidebar-border/50" />
                  </div>
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
            <div className="mt-3 pt-3 border-t border-sp-admin-sidebar-border/60">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={expanded}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-[13px] font-medium',
                  moreActive
                    ? 'text-sp-admin-sidebar-text'
                    : 'text-sp-admin-sidebar-muted hover:text-sp-admin-sidebar-text hover:bg-sp-admin-sidebar-hover',
                ].join(' ')}
              >
                <span className="w-5 h-5 shrink-0"><MoreIcon /></span>
                <span className="flex-1 text-left">Más</span>
                <span className={`w-4 h-4 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}>
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
                      onClose={close}
                      indent
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — usuario */}
        <div className="shrink-0 border-t border-sp-admin-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #8b3aad 0%, #c42880 100%)' }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-sp-admin-sidebar-text truncate" title={displayName}>
                {displayName}
              </div>
              {roleLabel && (
                <div className="text-[10px] text-sp-admin-sidebar-muted uppercase tracking-[0.15em]">
                  {roleLabel}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="p-2 rounded-lg text-sp-admin-sidebar-muted hover:text-sp-admin-sidebar-text hover:bg-sp-admin-sidebar-hover transition-colors shrink-0"
              onClick={() => {
                void fetch(logoutHref, { method: 'POST' }).then(() => {
                  router.push('/admin/login');
                });
              }}
            >
              <span className="w-4 h-4 block"><LogoutIcon /></span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

// ── Nav link ──────────────────────────────────────────────────────────

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
      style={active ? { background: 'rgba(245, 99, 42, 0.13)' } : undefined}
      className={[
        'relative flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 text-[13px] font-medium',
        indent ? 'pl-11 pr-3' : 'px-3',
        active
          ? 'text-white'
          : 'text-sp-admin-sidebar-muted hover:text-sp-admin-sidebar-text hover:bg-sp-admin-sidebar-hover',
      ].join(' ')}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-sp-admin-accent shadow-[0_0_6px_rgba(245,99,42,0.6)]" />
      )}
      <span className={`w-5 h-5 shrink-0 ${active ? 'text-sp-admin-accent' : ''}`}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}
