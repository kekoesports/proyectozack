import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { revisarGastos } from '@/lib/finance/expenseReview';
import { listTalentosSinPerfilFiscal } from '@/lib/finance/expenseAssistant';
import { RevisionFiscalGastos } from '@/features/admin/finance-dashboard/components/gastos/RevisionFiscalGastos';

export const metadata = { title: 'Revisión fiscal · Gastos' };

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

export default async function RevisionFiscalPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const today = todayInMadrid();
  const from = safeIsoDate(firstParam(sp.from)) ?? `${today.slice(0, 4)}-01-01`;
  const to = safeIsoDate(firstParam(sp.to)) ?? `${today.slice(0, 4)}-12-31`;

  const [revision, talentos] = await Promise.all([
    revisarGastos({ from, to }),
    listTalentosSinPerfilFiscal(),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <nav className="text-xs text-sp-admin-muted mb-1">
          <Link href="/admin/finanzas/gastos" className="hover:text-sp-admin-accent transition-colors">
            Gastos
          </Link>
          <span> / Revisión fiscal</span>
        </nav>
        <h1 className="text-xl font-bold text-sp-admin-text">Revisión fiscal de gastos</h1>
        <p className="text-xs text-sp-admin-muted mt-1 max-w-3xl">
          Cada gasto de {from} a {to} contrastado contra el perfil fiscal del talento. Solo aparece
          lo que se contradice o lo que no se ha podido comprobar; un gasto correcto no genera
          ninguna línea.
        </p>
      </header>

      <RevisionFiscalGastos revision={revision} talentos={talentos} />
    </div>
  );
}
