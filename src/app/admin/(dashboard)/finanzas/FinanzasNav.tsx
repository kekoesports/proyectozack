'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navegación canónica del hub de Finanzas (PR 2 rediseño 2026-07-06).
 *
 * 9 tabs — algunas placeholder por ahora, pero todas presentes para
 * fijar la estructura definitiva. Ver `docs/finanzas-audit.md` §14.
 *
 * Rutas legacy que siguen funcionales (accesibles por URL directa o
 * enlaces internos, NO en la nav):
 *   /admin/finanzas/mes                  (Control mensual)
 *   /admin/finanzas/cobros               (AR Aging)
 *   /admin/finanzas/pl                   (Histórico P&L)
 *   /admin/finanzas/gastos-operativos    (subvista antigua)
 *   /admin/finanzas/costes               (subvista antigua)
 *   /admin/finanzas/herramientas         (Landing importadores)
 *   /admin/finanzas/nominas/importar     (Wizard OCR)
 *   /admin/finanzas/setup-2026           (Wizard carga masiva)
 */

type Tab = {
  readonly href: string;
  readonly label: string;
  readonly extraPaths?: readonly string[];
  readonly soon?: boolean;
};

const TABS: readonly Tab[] = [
  { href: '/admin/finanzas/resumen', label: 'Resumen' },
  { href: '/admin/finanzas/caja', label: 'Caja', soon: true },
  {
    href: '/admin/finanzas/ingresos',
    label: 'Ingresos',
    // Facturación se restauró como módulo operativo propio (2026-07-07): la
    // URL canónica es /admin/facturacion y ya no forma parte del scope de
    // Finanzas → Ingresos (análisis). El tab Ingresos NO se marca activo
    // cuando el usuario está operando facturas.
  },
  {
    href: '/admin/finanzas/gastos',
    label: 'Gastos',
    extraPaths: ['/admin/finanzas/costes', '/admin/finanzas/gastos-operativos'],
  },
  {
    href: '/admin/finanzas/nominas-creadores',
    label: 'Nóminas y creadores',
    extraPaths: ['/admin/finanzas/nominas'],
  },
  { href: '/admin/finanzas/rentabilidad', label: 'Rentabilidad' },
  { href: '/admin/finanzas/contabilidad', label: 'Contabilidad' },
  { href: '/admin/finanzas/documentos', label: 'Documentos', soon: true },
  { href: '/admin/finanzas/informes', label: 'Informes', soon: true },
  {
    href: '/admin/finanzas/configuracion',
    label: 'Configuración',
    extraPaths: ['/admin/finanzas/setup-2026', '/admin/finanzas/herramientas'],
    soon: true,
  },
];

function isActive(pathname: string, tab: Tab): boolean {
  if (pathname === tab.href || pathname.startsWith(`${tab.href}/`)) return true;
  if (tab.extraPaths) {
    return tab.extraPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return false;
}

export function FinanzasNav(): React.ReactElement {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones de Finanzas"
      className="flex gap-1 border-b border-sp-border overflow-x-auto"
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active
                ? 'border-sp-orange text-sp-orange'
                : 'border-transparent text-sp-muted hover:text-sp-dark hover:border-sp-border'
            }`}
          >
            {tab.label}
            {tab.soon ? (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/25">
                Pronto
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
