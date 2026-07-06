import { requirePermission } from '@/lib/permissions';
import { PlaceholderSection } from '@/features/admin/finance-dashboard/components/PlaceholderSection';
import { EXPENSE_SUBTYPE_LABELS } from '@/lib/queries/financeDashboard/financeResumen.shared';

export const metadata = { title: 'Configuración · Finanzas' };

/**
 * Configuración financiera — placeholder + lectura de los enums vigentes
 * en el schema. Sin edición todavía (los enums están hardcodeados en
 * `db/schema/invoices.ts`; permitir edición requiere migración).
 */
export default async function FinanzasConfiguracionPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const subtypes = Object.entries(EXPENSE_SUBTYPE_LABELS);

  return (
    <div className="space-y-4 pt-2">
      <PlaceholderSection
        icon="⚙️"
        title="Configuración financiera"
        subtitle="Categorías de gasto, tipos de ingreso, entidades, divisas, reglas y plantillas."
        bullets={[
          'Categorías y subcategorías de gasto (hoy fijadas en el schema — el editor requiere migración).',
          'Tipos de ingreso, entidades emisoras, divisas soportadas.',
          'Reglas de categorización automática y plantillas de informes.',
          'PR 2 muestra la lista actual de subtipos en modo lectura.',
        ]}
        relatedLinks={[
          { href: '/admin/finanzas/setup-2026', label: 'Setup gastos 2026' },
          { href: '/admin/finanzas/herramientas', label: 'Herramientas de importación' },
        ]}
      />

      <div className="rounded-2xl border border-sp-border bg-sp-admin-card/60 p-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-sp-admin-muted mb-3">
          Subtipos de gasto vigentes (read-only)
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {subtypes.map(([key, label]) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-sp-border/60 px-3 py-2 text-xs bg-sp-admin-card"
            >
              <span className="text-sp-admin-fg font-medium">{label}</span>
              <code className="text-[10px] text-sp-admin-muted font-mono">{key}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
