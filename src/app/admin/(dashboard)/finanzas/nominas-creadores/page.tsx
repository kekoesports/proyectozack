import { requirePermission } from '@/lib/permissions';
import { PlaceholderSection } from '@/features/admin/finance-dashboard/components/PlaceholderSection';

export const metadata = { title: 'Nóminas y creadores · Finanzas' };

export default async function FinanzasNominasCreadoresPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  return (
    <PlaceholderSection
      icon="👥"
      title="Nóminas y creadores"
      subtitle="Nóminas internas y pagos a creadores/talentos, en una sola sección."
      bullets={[
        'Subvista A — Nóminas internas: persona, periodo, bruto/neto, coste empresa, IRPF, seguridad social, PDF.',
        'Subvista B — Pagos a talentos: talento, marca, campaña, importe pactado, pagado/pendiente, método, documento.',
        'Métricas: total pagado, pendiente con talentos, coste talento sobre ingresos, top talentos.',
        'PR 2 muestra placeholder; se reutilizará `invoices` con filtros por `expense_subtype` sin crear tabla nueva.',
      ]}
      relatedLinks={[
        { href: '/admin/finanzas/gastos', label: 'Gastos (filtro talento activo)' },
        { href: '/admin/finanzas/nominas/importar', label: 'Importar nóminas ELEVATEX' },
      ]}
    />
  );
}
