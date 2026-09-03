import Link from 'next/link';
import { requireFinancialPageSecurity } from '@/lib/security/financial-security';
import { getBankAnnualCashflowSummary, listBankAccountsWithStats } from '@/lib/queries/bankReconciliation';
import { getIssuerCompanies } from '@/lib/queries/issuedInvoices';

export const metadata = { title: 'Caja · Finanzas' };

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

type SearchParams = { readonly entity?: string; readonly year?: string };

function validYear(value: string | undefined): number {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : new Date().getFullYear();
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value);
}

function Metric({ label, value, tone = 'neutral' }: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'neutral' | 'good' | 'warn' | 'bad';
}): React.ReactElement {
  const toneClass = { neutral: 'text-sp-admin-fg', good: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-rose-400' }[tone];
  return (
    <div className="rounded-xl border border-sp-border bg-sp-admin-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-sp-admin-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function FinanzasCajaPage({ searchParams: searchParamsPromise }: {
  readonly searchParams: Promise<SearchParams>;
}): Promise<React.ReactElement> {
  await requireFinancialPageSecurity('read');
  const searchParams = await searchParamsPromise;
  const year = validYear(searchParams.year);
  const [accounts, issuers] = await Promise.all([listBankAccountsWithStats(), getIssuerCompanies()]);
  const issuerIds = new Set(accounts.flatMap((account) => account.issuerCompanyId ? [account.issuerCompanyId] : []));
  const entities = issuers.filter((issuer) => issuerIds.has(issuer.id)).map((issuer) => ({ id: issuer.id, label: issuer.legalName ?? issuer.name }));
  const requestedEntityId = Number(searchParams.entity);
  const selected = entities.find((entity) => entity.id === requestedEntityId) ?? entities[0] ?? null;

  if (!selected) {
    return (
      <div className="rounded-xl border border-sp-border bg-sp-admin-card px-5 py-10 text-center">
        <h1 className="text-xl font-bold">Caja</h1>
        <p className="mt-2 text-sm text-sp-admin-muted">Da de alta una cuenta bancaria para empezar el control financiero.</p>
        <Link href="/admin/facturacion/bancos" className="mt-4 inline-flex rounded-lg bg-sp-orange px-3 py-2 text-xs font-semibold text-white">Ir a cuentas bancarias</Link>
      </div>
    );
  }

  const summary = await getBankAnnualCashflowSummary({ issuerCompanyId: selected.id, year });
  const currencies = [...new Set([...summary.months.map((row) => row.currency), ...summary.invoiceMonths.map((row) => row.currency)])].sort();
  const selectedAccounts = accounts.filter((account) => account.issuerCompanyId === selected.id);
  const hasGaps = summary.unmatched > 0 || summary.missingReceipts > 0 || summary.uncategorizedExpenses > 0;

  return (
    <div className="space-y-5 pt-2">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-fg">Caja y actividad anual</h1>
          <p className="mt-1 text-sm text-sp-admin-muted">Entradas, salidas, facturación y categorías por entidad legal, sin mezclar monedas.</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-sp-border bg-sp-admin-card p-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted">
            Empresa
            <select name="entity" defaultValue={selected.id} className="mt-1 block rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-2 text-xs text-sp-admin-fg">
              {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.label}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted">
            Año
            <select name="year" defaultValue={year} className="mt-1 block rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-2 text-xs text-sp-admin-fg">
              {[year + 1, year, year - 1, year - 2].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-sp-orange px-3 py-2 text-xs font-semibold text-white">Ver</button>
        </form>
      </header>

      <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3">
        <p className="text-sm font-semibold text-sky-400">{selected.label}</p>
        <p className="mt-1 text-xs text-sp-admin-muted">Cuentas incluidas: {selectedAccounts.map((account) => account.displayName).join(', ')}. Ninguna cifra de otra empresa se suma aquí.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Movimientos del año" value={String(summary.transactions)} />
        <Metric label="Sin conciliar" value={String(summary.unmatched)} tone={summary.unmatched === 0 ? 'good' : 'warn'} />
        <Metric label="Justificantes pendientes" value={String(summary.missingReceipts)} tone={summary.missingReceipts === 0 ? 'good' : 'bad'} />
        <Metric label="Gastos sin categoría" value={String(summary.uncategorizedExpenses)} tone={summary.uncategorizedExpenses === 0 ? 'good' : 'warn'} />
      </div>

      <div className={`rounded-xl border px-4 py-3 ${hasGaps ? 'border-amber-500/25 bg-amber-500/5' : 'border-emerald-500/25 bg-emerald-500/5'}`}>
        <p className={`text-sm font-semibold ${hasGaps ? 'text-amber-400' : 'text-emerald-400'}`}>
          {hasGaps ? 'Las cifras son reales, pero el periodo todavía tiene documentación por revisar.' : 'El periodo no presenta huecos de conciliación, categoría o justificantes.'}
        </p>
        <p className="mt-1 text-xs text-sp-admin-muted">La Caixa se incorporará como otra cuenta de la SL; no requiere combinar ni rehacer Wise o Slash.</p>
      </div>

      {currencies.length === 0 ? (
        <div className="rounded-xl border border-sp-border bg-sp-admin-card px-5 py-10 text-center text-sm text-sp-admin-muted">No hay movimientos ni facturas en {year} para esta entidad.</div>
      ) : currencies.map((currency) => {
        const bankRows = summary.months.filter((row) => row.currency === currency);
        const invoiceRows = summary.invoiceMonths.filter((row) => row.currency === currency);
        const totals = bankRows.reduce((acc, row) => ({ income: acc.income + row.income, expenses: acc.expenses + row.expenses, net: acc.net + row.net }), { income: 0, expenses: 0, net: 0 });
        const invoiceTotals = invoiceRows.reduce((acc, row) => ({ billed: acc.billed + row.billed, collected: acc.collected + row.collected, outstanding: acc.outstanding + row.outstanding }), { billed: 0, collected: 0, outstanding: 0 });
        return (
          <section key={currency} className="rounded-xl border border-sp-border bg-sp-admin-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Resumen {year} · {currency}</h2>
              <div className="flex flex-wrap gap-3 text-xs"><span className="text-emerald-400">Entradas {money(totals.income, currency)}</span><span className="text-rose-400">Salidas {money(totals.expenses, currency)}</span><span className="font-bold">Neto {money(totals.net, currency)}</span></div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[850px] text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-sp-admin-muted"><tr><th className="py-2 text-left">Mes</th><th className="py-2 text-right">Entradas banco</th><th className="py-2 text-right">Salidas banco</th><th className="py-2 text-right">Neto</th><th className="py-2 text-right">Facturado</th><th className="py-2 text-right">Cobrado</th><th className="py-2 text-right">Pendiente</th><th className="py-2 text-right">Detalle</th></tr></thead>
                <tbody className="divide-y divide-sp-border">
                  {MONTHS.map((label, index) => {
                    const month = index + 1;
                    const bank = bankRows.find((row) => row.month === month);
                    const invoice = invoiceRows.find((row) => row.month === month);
                    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
                    return <tr key={month}><td className="py-2.5 font-semibold">{label}</td><td className="py-2.5 text-right text-emerald-400">{money(bank?.income ?? 0, currency)}</td><td className="py-2.5 text-right text-rose-400">{money(bank?.expenses ?? 0, currency)}</td><td className="py-2.5 text-right font-semibold">{money(bank?.net ?? 0, currency)}</td><td className="py-2.5 text-right">{money(invoice?.billed ?? 0, currency)}</td><td className="py-2.5 text-right">{money(invoice?.collected ?? 0, currency)}</td><td className="py-2.5 text-right text-amber-400">{money(invoice?.outstanding ?? 0, currency)}</td><td className="py-2.5 text-right"><Link href={`/admin/facturacion/bancos/cierre?entity=${selected.id}&month=${monthKey}`} className="text-sp-orange hover:underline">Abrir cierre</Link></td></tr>;
                  })}
                </tbody>
                <tfoot className="border-t border-sp-border font-bold"><tr><td className="pt-3">TOTAL</td><td className="pt-3 text-right text-emerald-400">{money(totals.income, currency)}</td><td className="pt-3 text-right text-rose-400">{money(totals.expenses, currency)}</td><td className="pt-3 text-right">{money(totals.net, currency)}</td><td className="pt-3 text-right">{money(invoiceTotals.billed, currency)}</td><td className="pt-3 text-right">{money(invoiceTotals.collected, currency)}</td><td className="pt-3 text-right text-amber-400">{money(invoiceTotals.outstanding, currency)}</td><td /></tr></tfoot>
              </table>
            </div>
          </section>
        );
      })}

      <section className="rounded-xl border border-sp-border bg-sp-admin-card p-4">
        <h2 className="text-sm font-bold">En qué se ha gastado</h2>
        <p className="mt-1 text-xs text-sp-admin-muted">Categorías procedentes del banco. “Sin categorizar” debe revisarse antes del cierre contable.</p>
        {summary.expenseCategories.length === 0 ? <p className="mt-4 text-sm text-sp-admin-muted">No hay salidas bancarias en este periodo.</p> : (
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="text-[10px] uppercase tracking-wider text-sp-admin-muted"><tr><th className="py-2 text-left">Categoría</th><th className="py-2 text-left">Moneda</th><th className="py-2 text-right">Operaciones</th><th className="py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-sp-border">
            {summary.expenseCategories.map((row) => <tr key={`${row.category}:${row.currency}`} className={row.category === 'Sin categorizar' ? 'bg-amber-500/5' : undefined}><td className="py-3 font-medium">{row.category}</td><td className="py-3 text-sp-admin-muted">{row.currency}</td><td className="py-3 text-right tabular-nums">{row.transactionCount}</td><td className="py-3 text-right font-semibold">{money(row.amount, row.currency)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="rounded-xl border border-sp-border bg-sp-admin-card p-4">
        <h2 className="text-sm font-bold">Principales proveedores y comercios</h2>
        <p className="mt-1 text-xs text-sp-admin-muted">Detalle real de las salidas según comercio, contraparte o descripción bancaria.</p>
        {summary.expenseCounterparties.length === 0 ? <p className="mt-4 text-sm text-sp-admin-muted">No hay proveedores o comercios en este periodo.</p> : (
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="text-[10px] uppercase tracking-wider text-sp-admin-muted"><tr><th className="py-2 text-left">Proveedor / comercio</th><th className="py-2 text-left">Moneda</th><th className="py-2 text-right">Operaciones</th><th className="py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-sp-border">
            {summary.expenseCounterparties.map((row) => <tr key={`${row.name}:${row.currency}`}><td className="max-w-[520px] truncate py-3 font-medium" title={row.name}>{row.name}</td><td className="py-3 text-sp-admin-muted">{row.currency}</td><td className="py-3 text-right tabular-nums">{row.transactionCount}</td><td className="py-3 text-right font-semibold">{money(row.amount, row.currency)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/facturacion/bancos/conciliacion?entity=${selected.id}`} className="rounded-lg bg-sp-orange px-3 py-2 text-xs font-semibold text-white">Conciliar movimientos</Link>
        <Link href={`/admin/facturacion/bancos/cierre?entity=${selected.id}`} className="rounded-lg border border-sp-border px-3 py-2 text-xs font-semibold">Abrir cierre mensual</Link>
        <Link href="/admin/facturacion/bancos" className="rounded-lg border border-sp-border px-3 py-2 text-xs font-semibold">Gestionar cuentas</Link>
      </div>
    </div>
  );
}
