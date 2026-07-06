import Link from 'next/link';

interface AccesoItem {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

const ACCESOS: readonly AccesoItem[] = [
  { href: '/admin/finanzas/nominas/importar', title: 'Importar nóminas', description: 'Wizard OCR para nóminas ELEVATEX.', icon: '📄' },
  { href: '/admin/finanzas/gastos',           title: 'Ver gastos',       description: 'Todos los gastos con filtros y categorización.', icon: '💸' },
  { href: '/admin/finanzas/costes',           title: 'Costes directos',  description: 'Vista específica de campaign_direct.', icon: '🎯' },
  { href: '/admin/finanzas/rentabilidad',     title: 'Rentabilidad',     description: 'Márgenes por marca / campaña / talento (próximamente).', icon: '📈' },
];

export function NominasAccesosRapidos(): React.ReactElement {
  return (
    <section aria-labelledby="accesos-nominas-title" className="space-y-3">
      <h2 id="accesos-nominas-title" className="text-sm font-bold text-sp-admin-fg">Accesos rápidos</h2>
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
