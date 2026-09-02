import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIssuerCompany } from '@/lib/queries/issuedInvoices';
import { getSlashCardSpendSummaries, listRecentSlashTransactions } from '@/lib/queries/slashAccounting';
import { requireFinancialPageSecurity } from '@/lib/security/financial-security';
import { updateSlashCardOwnerAction } from './actions';
import { env } from '@/lib/env';

export const metadata = { title: 'Gastos Slash | Admin' };

function money(value: number | string, currency = 'USD'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(Number(value));
}

export default async function SlashAccountingPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly entity?: string }>;
}): Promise<React.ReactElement> {
  await requireFinancialPageSecurity('read');
  const { entity } = await searchParams;
  const issuerCompanyId = Number(entity);
  if (!Number.isInteger(issuerCompanyId) || issuerCompanyId < 1) notFound();

  const [issuer, cards, transactions] = await Promise.all([
    getIssuerCompany(issuerCompanyId),
    getSlashCardSpendSummaries(issuerCompanyId),
    listRecentSlashTransactions(issuerCompanyId, 75),
  ]);
  if (!issuer || issuer.taxId !== env.SLASH_PLAYMAKER_ISSUER_TAX_ID) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/facturacion/bancos" className="text-xs text-sp-orange hover:underline">← Cuentas bancarias</Link>
          <h1 className="text-xl font-bold mt-2">Gastos de Slash</h1>
          <p className="text-sm text-sp-admin-muted mt-0.5">{issuer.legalName ?? issuer.name} · contabilidad independiente en USD</p>
        </div>
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
          Solo lectura · no permite mover dinero
        </div>
      </header>

      <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-xs text-sp-admin-muted">
        Estos importes no se suman al panel económico de ELEVATEX AGENCY PA SL. La conciliación, los justificantes y la exportación contable se mantienen dentro de PLAYMAKER MEDIA LLC.
      </div>

      <section>
        <h2 className="text-sm font-bold mb-3">Tarjetas y responsables</h2>
        {cards.length === 0 ? (
          <div className="rounded-xl border border-sp-border bg-sp-admin-card px-4 py-10 text-center text-sm text-sp-admin-muted">
            Todavía no hay tarjetas sincronizadas desde Slash.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article key={card.cardId} className="rounded-xl border border-sp-border bg-sp-admin-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{card.ownerLabel ?? card.displayName}</p>
                    <p className="text-xs text-sp-admin-muted mt-0.5">Tarjeta •••• {card.last4} · {card.status}</p>
                  </div>
                  <p className="text-lg font-black text-sp-orange">{money(card.currentMonthSpend)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div><p className="text-sp-admin-muted">Últimos 30 días</p><p className="font-semibold mt-0.5">{money(card.last30DaysSpend)}</p></div>
                  <div><p className="text-sp-admin-muted">Movimientos</p><p className="font-semibold mt-0.5">{card.transactionCount}</p></div>
                  <div><p className="text-sp-admin-muted">Justificantes pendientes</p><p className="font-semibold mt-0.5 text-amber-500">{card.missingReceipts}</p></div>
                  <div><p className="text-sp-admin-muted">Comisión FX / cashback</p><p className="font-semibold mt-0.5">{money(card.fxFees)} / {money(card.cashback)}</p></div>
                </div>
                <form action={updateSlashCardOwnerAction} className="flex gap-2 mt-4">
                  <input type="hidden" name="cardId" value={card.cardId} />
                  <input type="hidden" name="issuerCompanyId" value={issuerCompanyId} />
                  <input name="ownerLabel" defaultValue={card.ownerLabel ?? ''} placeholder="Responsable de la tarjeta" className="min-w-0 flex-1 rounded-lg border border-sp-border bg-sp-admin-bg px-2.5 py-1.5 text-xs" />
                  <button type="submit" className="rounded-lg bg-sp-orange/10 px-2.5 py-1.5 text-xs font-semibold text-sp-orange hover:bg-sp-orange/20">Guardar</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-sp-border bg-sp-admin-card overflow-hidden">
        <div className="px-4 py-3 border-b border-sp-border">
          <h2 className="text-sm font-bold">Últimos movimientos</h2>
          <p className="text-xs text-sp-admin-muted mt-0.5">Solo operaciones contabilizables asentadas por Slash.</p>
        </div>
        {transactions.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-sp-admin-muted">No hay movimientos sincronizados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sp-admin-bg/50 text-[10px] uppercase tracking-wider text-sp-admin-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Tarjeta</th>
                  <th className="px-4 py-2 text-left">Comercio</th>
                  <th className="px-4 py-2 text-left">Importe original</th>
                  <th className="px-4 py-2 text-right">Liquidado</th>
                  <th className="px-4 py-2 text-left">Justificante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sp-border">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 text-xs text-sp-admin-muted">{transaction.bookingDate.toLocaleDateString('es-ES')}</td>
                    <td className="px-4 py-3 text-xs">{transaction.cardLabel ?? (transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : 'Cuenta')}</td>
                    <td className="px-4 py-3">{transaction.merchantName ?? transaction.description}</td>
                    <td className="px-4 py-3 text-sp-admin-muted">
                      {transaction.originalAmount && transaction.originalCurrency ? money(transaction.originalAmount, transaction.originalCurrency) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${transaction.direction === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {transaction.direction === 'expense' ? '−' : '+'}{money(transaction.amount, transaction.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {transaction.receiptStatus === 'missing' ? <span className="text-amber-500">Pendiente</span> : <span className="text-emerald-500">Correcto</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
