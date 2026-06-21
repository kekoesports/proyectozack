import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import {
  listBankTransactions,
  countBankTransactions,
  getBankReconciliationKpis,
} from '@/lib/queries/bankReconciliation';
import { getCandidatesForTransactions } from '@/lib/queries/bankReconciliationCandidates';
import {
  getMatchedTransactionsWithPaymentStatus,
  countMatchedTransactions,
} from '@/lib/queries/bankReconciliationMatched';
import { TransactionReviewList } from './TransactionReviewList';
import { MatchedTransactionList } from './MatchedTransactionList';

export const metadata = { title: 'Conciliación bancaria | Admin' };

type SearchParams = { readonly status?: string; readonly page?: string };

export default async function ConciliacionPage(props: {
  readonly searchParams: Promise<SearchParams>;
}): Promise<React.ReactElement> {
  await requirePermission('bancos', 'read');

  const searchParams = await props.searchParams;
  const statusFilter = (searchParams.status ?? 'imported') as 'imported' | 'needs_review' | 'matched';
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  const kpis = await getBankReconciliationKpis();
  const matchedCount = await countMatchedTransactions();

  let content: React.ReactElement;
  let total = 0;

  if (statusFilter === 'matched') {
    const rows = await getMatchedTransactionsWithPaymentStatus({ limit, offset });
    total = matchedCount;
    content = <MatchedTransactionList rows={rows} />;
  } else {
    const [rawTransactions, txTotal] = await Promise.all([
      listBankTransactions({ status: statusFilter, limit, offset }),
      countBankTransactions({ status: statusFilter }),
    ]);
    total = txTotal;
    const transactions = await getCandidatesForTransactions(rawTransactions);
    content = transactions.length === 0
      ? (
        <div className="rounded-xl border border-sp-border bg-sp-admin-card px-4 py-12 text-center text-sm text-sp-admin-muted">
          No hay transacciones en este estado.
          {statusFilter === 'imported' && (
            <> <Link href="/admin/facturacion/bancos/importar" className="text-sp-orange hover:underline">Importa un extracto</Link> para comenzar.</>
          )}
        </div>
      )
      : <TransactionReviewList transactions={transactions} />;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Conciliación bancaria</h1>
          <p className="text-sm text-sp-admin-muted mt-0.5">
            Revisa y aprueba las sugerencias de conciliación de transacciones
          </p>
        </div>
        <Link
          href="/admin/facturacion/bancos/importar"
          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors"
        >
          + Importar extracto
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-sp-admin-bg border border-sp-border w-fit">
        {[
          { value: 'imported', label: `Sin conciliar (${kpis.importedUnmatched})` },
          { value: 'needs_review', label: `Requieren revisión (${kpis.needsReview})` },
          { value: 'matched', label: `Conciliadas (${matchedCount})` },
        ].map(({ value, label }) => (
          <Link
            key={value}
            href={`/admin/facturacion/bancos/conciliacion?status=${value}`}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === value
                ? 'bg-sp-admin-card shadow-sm text-sp-admin-fg'
                : 'text-sp-admin-muted hover:text-sp-admin-fg'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {content}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-sp-admin-muted">
          <span>Página {page} de {totalPages} ({total} total)</span>
          <div className="flex gap-1">
            {page > 1 && (
              <Link href={`/admin/facturacion/bancos/conciliacion?status=${statusFilter}&page=${page - 1}`}
                className="px-2.5 py-1 rounded-lg border border-sp-border hover:bg-sp-admin-bg transition-colors">
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/facturacion/bancos/conciliacion?status=${statusFilter}&page=${page + 1}`}
                className="px-2.5 py-1 rounded-lg border border-sp-border hover:bg-sp-admin-bg transition-colors">
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
