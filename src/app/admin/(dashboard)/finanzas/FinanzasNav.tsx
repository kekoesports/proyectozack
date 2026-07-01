'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  readonly href: string;
  readonly label: string;
  readonly extraPaths?: readonly string[];
};

const TABS: readonly Tab[] = [
  { href: '/admin/finanzas/resumen', label: 'Control mensual' },
  { href: '/admin/finanzas/cobros', label: 'Cobros pendientes' },
  { href: '/admin/finanzas/pl', label: 'Histórico mensual' },
  {
    href: '/admin/finanzas/gastos',
    label: 'Gastos y clasificación',
    extraPaths: ['/admin/finanzas/costes', '/admin/finanzas/gastos-operativos'],
  },
  {
    href: '/admin/finanzas/herramientas',
    label: 'Importar documentos',
    extraPaths: ['/admin/finanzas/setup-2026', '/admin/finanzas/nominas'],
  },
];

export function FinanzasNav(): React.ReactElement {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-sp-border">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href ||
          pathname.startsWith(`${tab.href}/`) ||
          (tab.extraPaths?.some(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          ) ?? false);
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
