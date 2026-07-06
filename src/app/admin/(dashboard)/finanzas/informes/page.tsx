import { requirePermission } from '@/lib/permissions';
import { PlaceholderSection } from '@/features/admin/finance-dashboard/components/PlaceholderSection';

export const metadata = { title: 'Informes · Finanzas' };

export default async function FinanzasInformesPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  return (
    <PlaceholderSection
      icon="📊"
      title="Informes"
      subtitle="Exportes y informes recurrentes con filtros comunes."
      bullets={[
        'P&L mensual, Flujo de caja, Gastos por categoría, Pendiente de cobro/pago.',
        'Rentabilidad por campaña, Pagos a talentos, Nóminas, Documentos pendientes.',
        'Filtros: fecha, entidad, cliente, marca, talento, categoría, estado.',
        'Exportes CSV (nativo). Excel/PDF si ya existe soporte, sin nuevas dependencias.',
        'PR 2 muestra placeholder; los reportes existentes viven en Histórico mensual.',
      ]}
      relatedLinks={[
        { href: '/admin/finanzas/pl', label: 'Histórico P&L (actual)' },
        { href: '/admin/facturacion/exports', label: 'Exports antiguos' },
      ]}
    />
  );
}
