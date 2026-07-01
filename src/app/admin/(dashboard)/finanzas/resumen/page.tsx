import { requirePermission } from '@/lib/permissions';
import { getFinanzasResumenV2 } from '@/lib/queries/financeDashboard/finanzasResumenV2';
import { ResumenFilters } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenFilters';
import { ResumenIngresosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenIngresosBlock';
import { ResumenCostesMargenBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenCostesMargenBlock';
import { ResumenNominasBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenNominasBlock';
import { ResumenImpuestosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenImpuestosBlock';
import { ResumenOperativosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenOperativosBlock';
import { ResumenResultadoBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenResultadoBlock';
import { ResumenPendientesBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenPendientesBlock';

export const metadata = { title: 'Resumen · Finanzas' };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayInMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function safeIsoDate(v: string | undefined): string | undefined {
  if (!v || !ISO_DATE_RE.test(v)) return undefined;
  return v;
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasResumenPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const from = safeIsoDate(firstParam(sp.from));
  const to = safeIsoDate(firstParam(sp.to));

  const data = await getFinanzasResumenV2({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const today = todayInMadrid();
  const defaults = {
    from: `${today.slice(0, 4)}-01-01`,
    to: today,
  };

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-fg">Resumen económico</h1>
          <p className="text-sm text-sp-admin-muted">
            De lo facturado, cuánto se queda SocialPro después de talents, nóminas, impuestos y gastos operativos.
          </p>
        </div>
      </header>

      <ResumenFilters applied={data.period} defaults={defaults} />

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

      <ResumenPendientesBlock pendientes={data.pendientes} />
    </div>
  );
}
