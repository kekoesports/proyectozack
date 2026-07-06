import { requirePermission } from '@/lib/permissions';
import { PlaceholderSection } from '@/features/admin/finance-dashboard/components/PlaceholderSection';

export const metadata = { title: 'Rentabilidad · Finanzas' };

export default async function FinanzasRentabilidadPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  return (
    <PlaceholderSection
      icon="📈"
      title="Rentabilidad"
      subtitle="Qué campañas, marcas, clientes y talentos dejan dinero."
      bullets={[
        'Rentabilidad por marca / cliente / campaña / talento / servicio.',
        'Ingresos, costes directos, pagos a talentos, producción, gastos asociados, margen bruto, % margen.',
        'Rankings de campañas más y menos rentables, concentración de ingresos.',
        'Alertas: campaña con margen bajo, cliente concentra demasiado ingreso, talento con coste alto.',
        'PR 2 muestra placeholder; el detalle vive en el histórico mensual mientras tanto.',
      ]}
      relatedLinks={[
        { href: '/admin/finanzas/pl', label: 'Histórico mensual P&L' },
        { href: '/admin/finanzas/mes', label: 'Control mensual' },
      ]}
    />
  );
}
