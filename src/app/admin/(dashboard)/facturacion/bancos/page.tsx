import Link from 'next/link';
import { canDelete } from '@/lib/permissions';
import { requireFinancialPageSecurity } from '@/lib/security/financial-security';
import { getBankReconciliationKpisByIssuer, listBankAccountsWithStats } from '@/lib/queries/bankReconciliation';
import { getIssuerCompanies } from '@/lib/queries/issuedInvoices';
import type { BankAccountWithStats, BankEntityReconciliationKpis } from '@/types';
import { BankAccountForm } from './BankAccountForm';

export const metadata = { title: 'Cuentas bancarias | Admin' };

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES').format(n);
}

function KpiCard({ label, value, accent }: {
  readonly label: string;
  readonly value: string;
  readonly accent: string;
}): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted leading-none">{label}</p>
        <p className="text-[17px] font-bold tabular-nums mt-1.5 leading-none" style={{ color: accent }}>{value}</p>
      </div>
    </div>
  );
}

function AccountsTable({ accounts }: { readonly accounts: readonly BankAccountWithStats[] }): React.ReactElement {
  if (accounts.length === 0) {
    return <div className="px-4 py-6 text-center text-sm text-sp-admin-muted">No hay cuentas asociadas.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-sp-admin-muted bg-sp-admin-bg/50">
            <th className="px-4 py-2 text-left font-semibold">Nombre</th>
            <th className="px-4 py-2 text-left font-semibold">Proveedor</th>
            <th className="px-4 py-2 text-left font-semibold">Banco</th>
            <th className="px-4 py-2 text-left font-semibold">Cuenta</th>
            <th className="px-4 py-2 text-left font-semibold">Moneda</th>
            <th className="px-4 py-2 text-right font-semibold">Transacciones</th>
            <th className="px-4 py-2 text-right font-semibold">Sin conciliar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sp-border">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-sp-admin-bg/40 transition-colors">
              <td className="px-4 py-3 font-medium">{account.displayName}</td>
              <td className="px-4 py-3 uppercase text-xs text-sp-admin-muted">{account.provider}</td>
              <td className="px-4 py-3 text-sp-admin-muted">{account.bankName ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-sp-admin-muted">
                {account.ibanMasked ?? (account.accountLast4 ? `•••• ${account.accountLast4}` : '—')}
              </td>
              <td className="px-4 py-3 text-sp-admin-muted">{account.currency}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmt(account.totalTransactions)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className={account.unmatchedCount > 0 ? 'text-amber-500 font-semibold' : 'text-sp-admin-muted'}>
                  {fmt(account.unmatchedCount)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntitySection({ entity, accounts }: {
  readonly entity: BankEntityReconciliationKpis;
  readonly accounts: readonly BankAccountWithStats[];
}): React.ReactElement {
  const hasSlash = accounts.some((account) => account.provider === 'slash');
  const hasWise = accounts.some((account) => account.provider === 'wise');
  return (
    <section className="rounded-xl border border-sp-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-sp-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{entity.issuerName}</p>
          <p className="text-[11px] text-sp-admin-muted">Contabilidad independiente</p>
        </div>
        {entity.issuerCompanyId !== null ? (
          <div className="flex gap-2">
            <Link href={`/admin/facturacion/bancos/conciliacion?entity=${entity.issuerCompanyId}`} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-sp-border text-sp-admin-fg hover:bg-sp-admin-bg transition-colors">
              Conciliar entidad
            </Link>
            {hasSlash ? (
              <Link href={`/admin/facturacion/bancos/slash?entity=${entity.issuerCompanyId}`} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sp-orange/10 text-sp-orange hover:bg-sp-orange/20 transition-colors">
                Ver gastos de Slash
              </Link>
            ) : null}
            {hasWise ? (
              <Link href="/admin/facturacion/bancos/importar?provider=wise" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                Importar Wise
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-sp-border">
        <KpiCard label="Movimientos" value={fmt(entity.totalTransactions)} accent="#6366f1" />
        <KpiCard label="Sin conciliar" value={fmt(entity.importedUnmatched)} accent="#f59e0b" />
        <KpiCard label="Conciliadas" value={fmt(entity.matched)} accent="#22c55e" />
        <KpiCard label="Revisión" value={fmt(entity.needsReview)} accent="#ef4444" />
      </div>
      <AccountsTable accounts={accounts} />
    </section>
  );
}

export default async function BancosPage(): Promise<React.ReactElement> {
  const session = await requireFinancialPageSecurity('read');
  const isAdmin = canDelete(session.user.role as 'admin' | 'staff');
  const [accounts, entities, issuers] = await Promise.all([
    listBankAccountsWithStats(),
    getBankReconciliationKpisByIssuer(),
    getIssuerCompanies(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Cuentas bancarias</h1>
          <p className="text-sm text-sp-admin-muted mt-0.5">Cada entidad legal se calcula y revisa por separado.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/facturacion/bancos/importar" className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors">+ Importar extracto</Link>
          {isAdmin ? <BankAccountForm issuers={issuers.map(({ id, name, legalName }) => ({ id, name, legalName }))} /> : null}
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3">
        <p className="text-sm font-semibold text-sky-400">Sin consolidación entre empresas</p>
        <p className="text-xs text-sp-admin-muted mt-1">
          ELEVATEX AGENCY PA SL y PLAYMAKER MEDIA LLC no se suman en un total global. Cada bloque, conciliación e informe conserva su propia entidad.
        </p>
      </div>

      {entities.length === 0 ? (
        <div className="rounded-xl border border-sp-border bg-sp-admin-card px-4 py-10 text-center text-sm text-sp-admin-muted">No hay cuentas bancarias registradas.</div>
      ) : entities.map((entity) => (
        <EntitySection
          key={entity.issuerCompanyId ?? 'unassigned'}
          entity={entity}
          accounts={accounts.filter((account) => account.issuerCompanyId === entity.issuerCompanyId)}
        />
      ))}
    </div>
  );
}
