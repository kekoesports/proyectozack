import { requirePermission } from '@/lib/permissions';
import { getSaludDelDato } from '@/lib/finance/dataHealth';
import { SaludDelDatoPanel } from '@/features/admin/finance-dashboard/components/SaludDelDatoPanel';

export const metadata = { title: 'Salud del dato · Finanzas' };

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

export default async function SaludDelDatoPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const today = todayInMadrid();
  const from = safeIsoDate(firstParam(sp.from)) ?? `${today.slice(0, 4)}-01-01`;
  const to = safeIsoDate(firstParam(sp.to)) ?? `${today.slice(0, 4)}-12-31`;

  const salud = await getSaludDelDato({ from, to });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-sp-admin-text">Salud del dato</h1>
        <p className="text-xs text-sp-admin-muted mt-1 max-w-3xl">
          Lo que hay que arreglar en los datos de {from} a {to} para que las cifras se sostengan.
          Cada chequeo explica qué mira y por qué importa, también cuando sale limpio.
        </p>
      </header>

      <SaludDelDatoPanel salud={salud} />
    </div>
  );
}
