'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  prefetch?: boolean | null;
}

type PortalSidebarProps = {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  userEmail: string;
  logoutHref: string;
  variant?: 'light' | 'dark';
}

/**
 * Sidebar compartida por los portales de admin y marcas. Colapsa a barra de
 * iconos en desktop con tooltips, y a drawer overlay en mobile. Soporta
 * variante `light` (marcas) y `dark` (admin).
 *
 * @kind client
 * @feature layout
 * @example
 * ```tsx
 * <PortalSidebar
 *   title="Admin"
 *   subtitle="SocialPro"
 *   navItems={ADMIN_NAV}
 *   userEmail={session.user.email}
 *   logoutHref="/admin/logout"
 *   variant="dark"
 * />
 * ```
 */
export function PortalSidebar({
  title,
  navItems,
  userEmail,
  logoutHref,
  variant = 'light',
}: PortalSidebarProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dark = variant === 'dark';

  function isActive(href: string): boolean {
    if (href === '/admin' || href === '/marcas') return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = userEmail.slice(0, 2).toUpperCase();
  const divider = dark ? 'border-sp-admin-border' : 'border-sp-border/60';
  const tooltipCn = dark
    ? 'bg-sp-admin-card border border-sp-admin-border text-sp-admin-text text-xs'
    : 'text-xs';

  return (
    <TooltipProvider delay={200}>
      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div className={`md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b ${dark ? 'bg-sp-admin-sidebar border-sp-admin-border' : 'bg-white border-sp-border'}`}>
        <Link href="/" className="font-display text-lg font-black uppercase gradient-text">
          {title}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
          className={`p-2 rounded-md transition-colors ${dark ? 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover' : 'text-sp-muted hover:text-sp-dark hover:bg-sp-off'}`}
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
      <nav className={`
        fixed md:static z-50 top-0 left-0 h-full flex flex-col shrink-0
        transition-transform duration-200 ease-out
        w-56 md:w-14
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${dark ? 'bg-sp-admin-sidebar' : 'bg-white border-r border-sp-border'}
      `}>

        {/* Logo */}
        <div className={`h-14 flex items-center justify-center shrink-0 border-b ${divider}`}>
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="font-display text-xl font-black uppercase gradient-text hover:opacity-80 transition-opacity"
            aria-label={title}
          >
            SP
          </Link>
        </div>

        {/* Nav items */}
        <div className="flex-1 flex flex-col gap-0.5 py-2 px-2 overflow-y-auto">
          {navItems.map(({ href, label, icon, prefetch }) => {
            const active = isActive(href);
            const prefetchValue = prefetch ?? null;

            const itemCn = [
              'relative flex items-center rounded-lg transition-colors',
              // mobile: full width with gap + padding
              'gap-3 px-3 py-2.5',
              // desktop: square icon box
              'md:w-10 md:h-10 md:justify-center md:gap-0 md:p-0',
              dark
                ? active
                  ? 'text-sp-admin-accent bg-sp-admin-accent/10'
                  : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
                : active
                  ? 'text-sp-dark bg-sp-off'
                  : 'text-sp-muted hover:text-sp-dark hover:bg-sp-off/60',
            ].join(' ');

            return (
              <Tooltip key={href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={href}
                      prefetch={prefetchValue}
                      onClick={() => setOpen(false)}
                      aria-label={label}
                      className={itemCn}
                    />
                  }
                >
                  {/* Active left indicator — desktop only */}
                  {active && (
                    <span className={`hidden md:block absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${dark ? 'bg-sp-admin-accent' : 'bg-sp-orange'}`} />
                  )}

                  {icon && <span className="w-5 h-5 shrink-0">{icon}</span>}

                  {/* Label — mobile only */}
                  <span className="md:hidden text-[13px] font-medium">{label}</span>

                  {/* Active dot — mobile only */}
                  {active && (
                    <span className={`md:hidden ml-auto w-1.5 h-1.5 rounded-full ${dark ? 'bg-sp-admin-accent' : 'bg-sp-orange'}`} />
                  )}
                </TooltipTrigger>

                <TooltipContent side="right" className={tooltipCn}>
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`shrink-0 border-t ${divider} p-2`}>
          {/* Mobile: email + logout */}
          <div className="md:hidden px-2 py-1.5">
            <p className={`text-[11px] truncate ${dark ? 'text-sp-admin-muted' : 'text-sp-muted'}`}>{userEmail}</p>
            <Link
              href={logoutHref}
              className={`mt-1 block text-[11px] transition-colors ${dark ? 'text-sp-admin-muted hover:text-sp-admin-text' : 'text-sp-muted hover:text-sp-dark'}`}
            >
              Cerrar sesión
            </Link>
          </div>

          {/* Desktop: initials circle + tooltip */}
          <div className="hidden md:flex justify-center">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href={logoutHref}
                    aria-label={`${userEmail} · Cerrar sesión`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-opacity hover:opacity-70 ${dark ? 'bg-sp-admin-hover text-sp-admin-text' : 'bg-sp-off text-sp-dark'}`}
                  />
                }
              >
                {initials}
              </TooltipTrigger>
              <TooltipContent side="right" className={tooltipCn}>
                <p className="text-xs truncate max-w-[200px]">{userEmail}</p>
                <p className={`text-[10px] mt-0.5 ${dark ? 'text-sp-admin-muted' : 'text-sp-muted'}`}>Cerrar sesión</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
