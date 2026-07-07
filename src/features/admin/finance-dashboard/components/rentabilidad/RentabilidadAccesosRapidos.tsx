import Link from 'next/link';

const LINKS = [
  { href: '/admin/finanzas/ingresos',            label: 'Ver ingresos',            emoji: '💰' },
  { href: '/admin/finanzas/gastos',              label: 'Ver gastos',              emoji: '🧾' },
  { href: '/admin/finanzas/nominas-creadores',   label: 'Ver nóminas y creadores', emoji: '👥' },
  { href: '/admin/finanzas/pl',                  label: 'Ver P&L',                 emoji: '📈' },
] as const;

export function RentabilidadAccesosRapidos(): React.ReactElement {
  return (
    <section aria-labelledby="rentabilidad-accesos-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
      <h2 id="rentabilidad-accesos-title" className="text-[11px] uppercase tracking-wider font-bold text-sp-admin-muted mb-3">
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-sp-border text-[12px] text-sp-admin-fg hover:border-sp-admin-accent/50 hover:bg-sp-admin-hover transition-colors"
          >
            <span aria-hidden>{l.emoji}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
