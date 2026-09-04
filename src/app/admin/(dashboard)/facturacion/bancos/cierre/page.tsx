import Link from 'next/link';
import { requireFinancialPageSecurity } from '@/lib/security/financial-security';
import { getBankMonthlyCloseSummary, listBankAccountsWithStats } from '@/lib/queries/bankReconciliation';
import { getIssuerCompanies } from '@/lib/queries/issuedInvoices';

export const metadata = { title: 'Cierre mensual | Admin' };

type SearchParams = { readonly entity?: string; readonly month?: string };

function previousCompletedMonth(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function validMonth(value: string | undefined): string {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : previousCompletedMonth();
}

function adjacentMonth(value: string, offset: number): string {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value);
}

function StatusCard({ label, value, ok }: {
  readonly label: string;
  readonly value: string;
  readonly ok: boolean;
}): React.ReactElement {
  return (
    <div className={`rounded-xl border px-4 py-3 ${ok ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/25 bg-amber-500/5'}`}>
      <p className="text-[10px] uppercase tracking-wider text-sp-admin-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</p>
    </div>
  );
}

export default async function MonthlyClosePage({
  searchParams: searchParamsPromise,
}: {
  readonly searchParams: Promise<SearchParams>;
}): Promise<React.ReactElement> {
  await requireFinancialPageSecurity('read');
  const searchParams = await searchParamsPromise;
  const month = validMonth(searchParams.month);
  const [year, monthNumber] = month.split('-').map(Number);
  const [accounts, issuers] = await Promise.all([listBankAccountsWithStats(), getIssuerCompanies()]);
  const issuerIds = new Set(accounts.flatMap((account) => account.issuerCompanyId ? [account.issuerCompanyId] : []));
  const entities = issuers
    .filter((issuer) => issuerIds.has(issuer.id))
    .map((issuer) => ({ id: issuer.id, label: issuer.legalName ?? issuer.name }));
  const entityId = Number(searchParams.entity);
  const selected = entities.find((entity) => entity.id === entityId);

  if (!selected || !year || !monthNumber) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/admin/facturacion/bancos" className="text-xs text-sp-orange hover:underline">← Cuentas bancarias</Link>
          <h1 className="mt-2 text-xl font-bold">Cierre mensual</h1>
          <p className="mt-1 text-sm text-sp-admin-muted">Selecciona una entidad. No hay un cierre combinado entre empresas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {entities.map((entity) => (
            <Link key={entity.id} href={`/admin/facturacion/bancos/cierre?entity=${entity.id}&month=${month}`} className="rounded-lg border border-sp-border px-3 py-2 text-xs font-semibold hover:bg-sp-admin-card">
              {entity.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const summary = await getBankMonthlyCloseSummary({ issuerCompanyId: entityId, year, month: monthNumber });
  const drafts = summary.invoiceCurrencies.reduce((sum, row) => sum + row.draftCount, 0);
  const ready = summary.transactions > 0 && summary.unmatched === 0 && summary.missingReceipts === 0 && drafts === 0;
  const previous = adjacentMonth(month, -1);
  const next = adjacentMonth(month, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/facturacion/bancos" className="text-xs text-sp-orange hover:underline">← Cuentas bancarias</Link>
          <h1 className="mt-2 text-xl font-bold">Cierre mensual · {selected.label}</h1>
          <p className="mt-1 text-sm text-sp-admin-muted">Control previo al cierre, siempre separado por entidad y moneda.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/facturacion/bancos/cierre?entity=${entityId}&month=${previous}`} className="rounded-lg border border-sp-border px-3 py-2 text-xs">← {previous}</Link>
          <span className="rounded-lg bg-sp-admin-card px-3 py-2 text-sm font-bold">{month}</span>
          <Link href={`/admin/facturacion/bancos/cierre?entity=${entityId}&month=${next}`} className="rounded-lg border border-sp-border px-3 py-2 text-xs">{next} →</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {entities.map((entity) => (
          <Link
            key={entity.id}
            href={`/admin/facturacion/bancos/cierre?entity=${entity.id}&month=${month}`}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${entity.id === entityId ? 'border-sp-orange bg-sp-orange/10 text-sp-orange' : 'border-sp-border text-sp-admin-muted'}`}
          >
            {entity.label}
          </Link>
        ))}
      </div>

      <div className={`rounded-xl border px-4 py-3 ${ready ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <p className={`font-bold ${ready ? 'text-emerald-400' : 'text-amber-400'}`}>
          {ready ? 'Periodo listo para revisión final' : 'Periodo todavía no listo para cerrar'}
        </p>
        <p className="mt-1 text-xs text-sp-admin-muted">El CRM no bloquea ni cierra el periodo: muestra qué falta para que una persona lo valide.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard label="Movimientos" value={String(summary.transactions)} ok={summary.transactions > 0} />
        <StatusCard label="Sin conciliar" value={String(summary.unmatched)} ok={summary.unmatched === 0} />
        <StatusCard label="Justificantes pendientes" value={String(summary.missingReceipts)} ok={summary.missingReceipts === 0} />
        <StatusCard label="Facturas en borrador" value={String(drafts)} ok={drafts === 0} />
      </div>

      <section className="rounded-xl border border-sp-border bg-sp-admin-card p-4">
        <h2 className="text-sm font-bold">Banco por moneda</h2>
        {summary.bankCurrencies.length === 0 ? (
          <p className="mt-3 text-sm text-sp-admin-muted">No hay movimientos bancarios en este periodo.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-sp-admin-muted">
                <tr><th className="py-2 text-left">Moneda</th><th className="py-2 text-right">Entradas</th><th className="py-2 text-right">Salidas</th><th className="py-2 text-right">Neto</th><th className="py-2 text-right">Comisiones FX</th></tr>
              </thead>
              <tbody className="divide-y divide-sp-border">
                {summary.bankCurrencies.map((row) => (
                  <tr key={row.currency}><td className="py-3 font-semibold">{row.currency}</td><td className="py-3 text-right text-emerald-400">{money(row.income, row.currency)}</td><td className="py-3 text-right text-rose-400">{money(row.expenses, row.currency)}</td><td className="py-3 text-right font-bold">{money(row.net, row.currency)}</td><td className="py-3 text-right">{money(row.fxFees, row.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-sp-border bg-sp-admin-card p-4">
        <h2 className="text-sm font-bold">Facturación emitida por moneda</h2>
        {summary.invoiceCurrencies.length === 0 ? (
          <p className="mt-3 text-sm text-sp-admin-muted">No hay facturas emitidas ni borradores del periodo.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-sp-admin-muted">
                <tr><th className="py-2 text-left">Moneda</th><th className="py-2 text-right">Emitidas</th><th className="py-2 text-right">Borradores</th><th className="py-2 text-right">Facturado</th><th className="py-2 text-right">Cobrado conciliado</th><th className="py-2 text-right">Pendiente</th></tr>
              </thead>
              <tbody className="divide-y divide-sp-border">
                {summary.invoiceCurrencies.map((row) => (
                  <tr key={row.currency}><td className="py-3 font-semibold">{row.currency}</td><td className="py-3 text-right">{row.issuedCount}</td><td className="py-3 text-right">{row.draftCount}</td><td className="py-3 text-right">{money(row.billed, row.currency)}</td><td className="py-3 text-right text-emerald-400">{money(row.collected, row.currency)}</td><td className="py-3 text-right text-amber-400">{money(row.outstanding, row.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/facturacion/bancos/conciliacion?entity=${entityId}`} className="rounded-lg bg-sp-orange px-3 py-2 text-xs font-semibold text-white">Revisar conciliación</Link>
        <Link href={`/admin/facturacion/bancos/importar?entity=${entityId}`} className="rounded-lg border border-sp-border px-3 py-2 text-xs font-semibold">Importar otro extracto</Link>
      </div>
    </div>
  );
}
