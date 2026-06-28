'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/finanzas/resumen',           label: 'Resumen' },
  { href: '/admin/finanzas/pl',                label: 'P&L' },
  { href: '/admin/finanzas/costes',            label: 'Costes campaña' },
  { href: '/admin/finanzas/gastos-operativos', label: 'Gastos operativos' },
  { href: '/admin/finanzas/setup-2026',        label: 'Setup 2026' },
] as const;

export function FinanzasNav(): React.ReactElement {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-sp-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? 'border-sp-orange text-sp-orange'
                : 'border-transparent text-sp-muted hover:text-sp-dark hover:border-sp-border'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
