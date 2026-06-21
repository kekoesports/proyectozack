import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { canDelete } from '@/lib/permissions';
import { listBankAccountsWithStats, getBankReconciliationKpis } from '@/lib/queries/bankReconciliation';
import { BankAccountForm } from './BankAccountForm';

export const metadata = { title: 'Cuentas bancarias | Admin' };

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES').format(n);
}

type KpiCardProps = {
  readonly label: string;
  readonly value: string;
  readonly accent: string;
};

function KpiCard({ label, value, accent }: KpiCardProps): React.ReactElement {
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

export default async function BancosPage(): Promise<React.ReactElement> {
  const session = await requirePermission('bancos', 'read');
  const isAdmin = canDelete(session.user.role as 'admin' | 'staff');

  const [accounts, kpis] = await Promise.all([
    listBankAccountsWithStats(),
    getBankReconciliationKpis(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Cuentas bancarias</h1>
          <p className="text-sm text-sp-admin-muted mt-0.5">Importa extractos y concilia transacciones</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/facturacion/bancos/importar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors"
          >
            + Importar extracto
          </Link>
          <Link
            href="/admin/facturacion/bancos/conciliacion"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border border-sp-border text-sp-admin-fg hover:bg-sp-admin-muted/10 transition-colors"
          >
            Conciliar
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total transacciones" value={fmt(kpis.totalTransactions)} accent="#6366f1" />
        <KpiCard label="Sin conciliar" value={fmt(kpis.importedUnmatched)} accent="#f59e0b" />
        <KpiCard label="Conciliadas" value={fmt(kpis.matched)} accent="#22c55e" />
        <KpiCard label="Requieren revisión" value={fmt(kpis.needsReview)} accent="#ef4444" />
      </div>

      {/* Account list */}
      <div className="rounded-xl border border-sp-border bg-sp-admin-card overflow-hidden">
        <div className="px-4 py-3 border-b border-sp-border flex items-center justify-between">
          <p className="text-sm font-semibold">Cuentas registradas</p>
          {isAdmin && <BankAccountForm />}
        </div>
        {accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-sp-admin-muted">
            No hay cuentas bancarias registradas. Añade una para comenzar a importar.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-sp-admin-muted bg-sp-admin-bg/50">
                <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                <th className="px-4 py-2 text-left font-semibold">Banco</th>
                <th className="px-4 py-2 text-left font-semibold">IBAN</th>
                <th className="px-4 py-2 text-left font-semibold">Moneda</th>
                <th className="px-4 py-2 text-right font-semibold">Transacciones</th>
                <th className="px-4 py-2 text-right font-semibold">Sin conciliar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sp-border">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-sp-admin-bg/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{acc.displayName}</td>
                  <td className="px-4 py-3 text-sp-admin-muted">{acc.bankName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-sp-admin-muted">{acc.ibanMasked ?? '—'}</td>
                  <td className="px-4 py-3 text-sp-admin-muted">{acc.currency}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(acc.totalTransactions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={acc.unmatchedCount > 0 ? 'text-amber-600 font-semibold' : 'text-sp-admin-muted'}>
                      {fmt(acc.unmatchedCount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
