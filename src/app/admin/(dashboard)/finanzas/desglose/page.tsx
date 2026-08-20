import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getRevenueBreakdown } from '@/lib/finance/revenue';
import { DesgloseTabla } from '@/features/admin/finance-dashboard/components/desglose/DesgloseTabla';

export const metadata = { title: 'Desglose de facturación · Finanzas' };

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

function isoOr(value: string | undefined, fallback: string): string {
  return value !== undefined && ISO_DATE_RE.test(value) ? value : fallback;
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * De dónde sale la cifra de facturación: las facturas que la componen, las que
 * se quedaron fuera y por qué.
 *
 * El total y el detalle salen de la misma llamada, así que no pueden divergir —
 * que es justo lo que hacía que Resumen y P&L se contradijeran antes de FV.1.
 */
export default async function DesglosePage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const today = todayInMadrid();
  const from = isoOr(firstParam(sp.from), `${today.slice(0, 4)}-01-01`);
  const to = isoOr(firstParam(sp.to), today);

  const breakdown = await getRevenueBreakdown({ from, to });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/finanzas/resumen"
          className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted hover:text-sp-admin-fg"
        >
          ← Volver al resumen
        </Link>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">
          Desglose de facturación
        </h1>
        <p className="text-sm text-sp-admin-muted">
          Del {from} al {to}. Cada línea es una factura emitida o un movimiento del
          libro de gestión. Abajo, lo que se dejó fuera y por qué.
        </p>
      </header>

      <DesgloseTabla breakdown={breakdown} />
    </div>
  );
}
