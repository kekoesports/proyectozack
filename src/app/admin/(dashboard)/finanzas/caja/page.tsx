import { requirePermission } from '@/lib/permissions';
import { PlaceholderSection } from '@/features/admin/finance-dashboard/components/PlaceholderSection';

export const metadata = { title: 'Caja · Finanzas' };

export default async function FinanzasCajaPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  return (
    <PlaceholderSection
      icon="💶"
      title="Caja"
      subtitle="Saldo real, cobros y pagos previstos, calendario de vencimientos."
      bullets={[
        'Saldo actual por cuenta bancaria cuando existan cuentas dadas de alta.',
        'Cobros esperados a 7 / 30 / 60 días (basado en facturas emitidas con vencimiento).',
        'Pagos esperados a 7 / 30 / 60 días (basado en gastos pendientes).',
        'Caja proyectada y calendario de vencimientos.',
        'La previsión se calculará a partir de facturas y gastos registrados hasta que exista importación bancaria activa.',
      ]}
      relatedLinks={[
        { href: '/admin/finanzas/cobros', label: 'Cobros pendientes (aging)' },
        { href: '/admin/facturacion/bancos', label: 'Cuentas bancarias' },
        { href: '/admin/facturacion/bancos/importar', label: 'Importar extractos' },
      ]}
    />
  );
}
