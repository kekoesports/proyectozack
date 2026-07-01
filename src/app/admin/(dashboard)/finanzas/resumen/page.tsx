import { requirePermission } from '@/lib/permissions';
import { getFinanzasResumenV2 } from '@/lib/queries/financeDashboard/finanzasResumenV2';
import { ResumenIngresosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenIngresosBlock';
import { ResumenCostesMargenBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenCostesMargenBlock';
import { ResumenNominasBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenNominasBlock';
import { ResumenImpuestosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenImpuestosBlock';
import { ResumenOperativosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenOperativosBlock';
import { ResumenResultadoBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenResultadoBlock';

export const metadata = { title: 'Resumen · Finanzas' };

function monthLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function FinanzasResumenPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const data = await getFinanzasResumenV2();

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-fg">Resumen económico</h1>
          <p className="text-sm text-sp-admin-muted">
            {monthLabel(data.period.from)} — {monthLabel(data.period.to)}
          </p>
        </div>
      </header>

      <ResumenIngresosBlock ingresos={data.ingresos} />

      <ResumenCostesMargenBlock
        costesDirectos={data.costesDirectos}
        margenBruto={data.margenBruto}
      />

      <ResumenNominasBlock nominas={data.nominas} />

      <ResumenImpuestosBlock impuestos={data.impuestos} />

      <ResumenOperativosBlock operativos={data.operativos} />

      <ResumenResultadoBlock
        margenBruto={data.margenBruto}
        nominas={data.nominas}
        impuestos={data.impuestos}
        operativos={data.operativos}
        resultado={data.resultado}
      />
    </div>
  );
}
