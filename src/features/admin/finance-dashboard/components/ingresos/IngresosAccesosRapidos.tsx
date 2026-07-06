import Link from 'next/link';

interface AccesoItem {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

const ACCESOS: readonly AccesoItem[] = [
  {
    href: '/admin/finanzas/ingresos/gestor',
    title: 'Gestor de facturación completo',
    description: 'Facturas emitidas, clientes de facturación, empresas emisoras.',
    icon: '📋',
  },
  {
    href: '/admin/facturacion/import',
    title: 'Importar factura PDF',
    description: 'Sube una factura en PDF — la IA extrae los datos.',
    icon: '📄',
  },
  {
    href: '/admin/facturacion/bancos/conciliacion',
    title: 'Conciliación bancaria',
    description: 'Aplica pagos desde extractos importados a facturas.',
    icon: '🏦',
  },
];

/**
 * Cards con enlaces útiles a las funciones que aún viven bajo
 * `/admin/facturacion/*`. Se preservan hasta que se completen las
 * secciones "Documentos" e "Ingresos" del nuevo hub.
 */
export function IngresosAccesosRapidos(): React.ReactElement {
  return (
    <section aria-labelledby="accesos-rapidos-title" className="space-y-3">
      <h2 id="accesos-rapidos-title" className="text-sm font-bold text-sp-admin-fg">
        Accesos rápidos
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-4 rounded-2xl border border-sp-border bg-sp-admin-card p-4 hover:border-sp-orange/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-sp-orange/10 flex items-center justify-center text-xl shrink-0">
              {a.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sp-admin-fg group-hover:text-sp-orange transition-colors">
                {a.title}
              </p>
              <p className="text-xs text-sp-admin-muted mt-0.5">
                {a.description}
              </p>
            </div>
            <svg className="w-4 h-4 text-sp-admin-muted group-hover:text-sp-orange transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
