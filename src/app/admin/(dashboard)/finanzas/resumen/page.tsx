import { requirePermission } from '@/lib/permissions';
import { getFinanceResumenKPIs } from '@/lib/queries/financeDashboard/financeResumen';
import { FinanceResumenBlocks } from '@/features/admin/finance-dashboard/components/FinanceResumenBlocks';

export const metadata = { title: 'Resumen financiero | Admin' };

export default async function FinanzasResumenPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const kpis = await getFinanceResumenKPIs();

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-lg font-bold text-sp-admin-fg">Resumen financiero</h1>
        <p className="text-xs text-sp-admin-muted mt-0.5">
          Bloque A (devengo) actualiza con cada factura. Bloque B (caja) solo refleja cobros/pagos conciliados via banco.
        </p>
      </div>
      <FinanceResumenBlocks kpis={kpis} />
    </div>
  );
}
