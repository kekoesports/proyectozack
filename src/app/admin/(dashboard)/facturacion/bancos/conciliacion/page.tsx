import Link from 'next/link';
import { requireFinancialPageSecurity } from '@/lib/security/financial-security';
import {
  countBankTransactions,
  getBankReconciliationKpisForIssuer,
  listBankAccountsWithStats,
  listBankTransactions,
} from '@/lib/queries/bankReconciliation';
import { getCandidatesForTransactions } from '@/lib/queries/bankReconciliationCandidates';
import { getMatchedTransactionsWithPaymentStatus, countMatchedTransactions } from '@/lib/queries/bankReconciliationMatched';
import { getIssuerCompanies } from '@/lib/queries/issuedInvoices';
import { TransactionReviewList } from './TransactionReviewList';
import { MatchedTransactionList } from './MatchedTransactionList';

export const metadata = { title: 'Conciliación bancaria | Admin' };

type SearchParams = { readonly status?: string; readonly page?: string; readonly entity?: string };
type ReconciliationStatus = 'imported' | 'needs_review' | 'matched';

function parseStatus(value: string | undefined): ReconciliationStatus {
  return value === 'needs_review' || value === 'matched' ? value : 'imported';
}

function EntityPicker({ entities, selectedId }: {
  readonly entities: readonly { readonly id: number; readonly label: string }[];
  readonly selectedId?: number;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {entities.map((entity) => (
        <Link
          key={entity.id}
          href={`/admin/facturacion/bancos/conciliacion?entity=${entity.id}`}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            selectedId === entity.id
              ? 'border-sp-orange bg-sp-orange/10 text-sp-orange'
              : 'border-sp-border text-sp-admin-muted hover:text-sp-admin-fg'
          }`}
        >
          {entity.label}
        </Link>
      ))}
    </div>
  );
}

export default async function ConciliacionPage({
  searchParams: searchParamsPromise,
}: {
  readonly searchParams: Promise<SearchParams>;
}): Promise<React.ReactElement> {
  await requireFinancialPageSecurity('read');
  const searchParams = await searchParamsPromise;
  const [accounts, issuers] = await Promise.all([listBankAccountsWithStats(), getIssuerCompanies()]);
  const issuerIdsWithAccounts = new Set(accounts.flatMap((account) => account.issuerCompanyId ? [account.issuerCompanyId] : []));
  const entities = issuers
    .filter((issuer) => issuerIdsWithAccounts.has(issuer.id))
    .map((issuer) => ({ id: issuer.id, label: issuer.legalName ?? issuer.name, country: issuer.country }));
  const issuerCompanyId = Number(searchParams.entity);
  const selected = entities.find((entity) => entity.id === issuerCompanyId);

  if (!selected) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/admin/facturacion/bancos" className="text-xs text-sp-orange hover:underline">← Cuentas bancarias</Link>
          <h1 className="text-xl font-bold mt-2">Conciliación bancaria</h1>
          <p className="text-sm text-sp-admin-muted mt-0.5">Selecciona una entidad. No existe una conciliación consolidada entre empresas.</p>
        </div>
        <EntityPicker entities={entities} />
        <div className="rounded-xl border border-sp-border bg-sp-admin-card px-4 py-12 text-center text-sm text-sp-admin-muted">
          Elige ELEVATEX o PLAYMAKER para revisar únicamente sus movimientos.
        </div>
      </div>
    );
  }

  const statusFilter = parseStatus(searchParams.status);
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const limit = 20;
  const offset = (page - 1) * limit;
  const [kpis, matchedCount] = await Promise.all([
    getBankReconciliationKpisForIssuer(issuerCompanyId),
    countMatchedTransactions(issuerCompanyId),
  ]);

  let content: React.ReactElement;
  let total = 0;
  if (statusFilter === 'matched') {
    const rows = await getMatchedTransactionsWithPaymentStatus({ limit, offset, issuerCompanyId });
    total = matchedCount;
    content = <MatchedTransactionList rows={rows} />;
  } else {
    const [rawTransactions, txTotal] = await Promise.all([
      listBankTransactions({ issuerCompanyId, status: statusFilter, limit, offset }),
      countBankTransactions({ issuerCompanyId, status: statusFilter }),
    ]);
    total = txTotal;
    const transactions = await getCandidatesForTransactions(rawTransactions, {
      issuerCompanyId,
      // Las facturas internas históricas no tienen entidad legal. Solo se
      // consideran para la operativa española; nunca para PLAYMAKER.
      includeLegacyInternalInvoices: /espa|spain/i.test(selected.country ?? ''),
    });
    content = transactions.length === 0 ? (
      <div className="rounded-xl border border-sp-border bg-sp-admin-card px-4 py-12 text-center text-sm text-sp-admin-muted">No hay transacciones en este estado para {selected.label}.</div>
    ) : <TransactionReviewList transactions={transactions} />;
  }

  const totalPages = Math.ceil(total / limit);
  const baseHref = `/admin/facturacion/bancos/conciliacion?entity=${issuerCompanyId}&status=${statusFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/facturacion/bancos" className="text-xs text-sp-orange hover:underline">← Cuentas bancarias</Link>
          <h1 className="text-xl font-bold mt-2">Conciliación · {selected.label}</h1>
          <p className="text-sm text-sp-admin-muted mt-0.5">Solo se muestran y concilian movimientos de esta entidad legal.</p>
        </div>
        <Link href={`/admin/facturacion/bancos/importar?entity=${issuerCompanyId}`} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors">+ Importar extracto</Link>
      </div>

      <EntityPicker entities={entities} selectedId={issuerCompanyId} />

      <div className="flex gap-1 p-1 rounded-xl bg-sp-admin-bg border border-sp-border w-fit">
        {[
          { value: 'imported', label: `Sin conciliar (${kpis.importedUnmatched})` },
          { value: 'needs_review', label: `Requieren revisión (${kpis.needsReview})` },
          { value: 'matched', label: `Conciliadas (${matchedCount})` },
        ].map(({ value, label }) => (
          <Link key={value} href={`/admin/facturacion/bancos/conciliacion?entity=${issuerCompanyId}&status=${value}`} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${statusFilter === value ? 'bg-sp-admin-card shadow-sm text-sp-admin-fg' : 'text-sp-admin-muted hover:text-sp-admin-fg'}`}>
            {label}
          </Link>
        ))}
      </div>

      {content}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-sp-admin-muted">
          <span>Página {page} de {totalPages} ({total} total)</span>
          <div className="flex gap-1">
            {page > 1 ? <Link href={`${baseHref}&page=${page - 1}`} className="px-2.5 py-1 rounded-lg border border-sp-border hover:bg-sp-admin-bg transition-colors">← Anterior</Link> : null}
            {page < totalPages ? <Link href={`${baseHref}&page=${page + 1}`} className="px-2.5 py-1 rounded-lg border border-sp-border hover:bg-sp-admin-bg transition-colors">Siguiente →</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
