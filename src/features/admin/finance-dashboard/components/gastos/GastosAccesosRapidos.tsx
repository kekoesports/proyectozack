import Link from 'next/link';

interface AccesoItem {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

const ACCESOS: readonly AccesoItem[] = [
  { href: '/admin/finanzas/costes',           title: 'Costes directos',   description: 'Vista específica del grupo campaign_direct.', icon: '🎯' },
  { href: '/admin/finanzas/gastos-operativos', title: 'Gastos operativos', description: 'Vista específica del grupo operational.',     icon: '⚙️' },
  { href: '/admin/finanzas/herramientas',      title: 'Importar documentos', description: 'Importar PDFs y CSV / setup de gastos.',    icon: '📥' },
  { href: '/admin/finanzas/setup-2026',        title: 'Setup gastos 2026', description: 'Carga histórica de gastos operativos.',       icon: '⚙️' },
];

export function GastosAccesosRapidos(): React.ReactElement {
  return (
    <section aria-labelledby="accesos-rapidos-gastos-title" className="space-y-3">
      <h2 id="accesos-rapidos-gastos-title" className="text-sm font-bold text-sp-admin-fg">Accesos rápidos</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACCESOS.map((a) => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-3 rounded-2xl border border-sp-border bg-sp-admin-card p-4 hover:border-sp-orange/40 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-sp-orange/10 flex items-center justify-center text-xl shrink-0">
              {a.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sp-admin-fg group-hover:text-sp-orange transition-colors">{a.title}</p>
              <p className="text-xs text-sp-admin-muted mt-0.5 line-clamp-2">{a.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
