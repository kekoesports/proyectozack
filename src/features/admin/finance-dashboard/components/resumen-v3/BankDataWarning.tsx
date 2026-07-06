interface Props {
  readonly bankTransactionsCount: number;
  readonly invoicePaymentsCount: number;
}

/**
 * Aviso visible cuando NO hay datos bancarios importados. En ese caso
 * los KPIs de "cobrado real" y "pagado real" muestran 0, y eso puede
 * confundir. El aviso explica que 0 no significa "no cobras/pagas",
 * significa "todavía no hemos importado extractos".
 *
 * Regla: si `bank_transactions = 0` Y `invoice_payments = 0` → mostrar.
 * Cuando aparezca cualquier movimiento bancario, el aviso desaparece.
 */
export function BankDataWarning({
  bankTransactionsCount,
  invoicePaymentsCount,
}: Props): React.ReactElement | null {
  if (bankTransactionsCount > 0 || invoicePaymentsCount > 0) return null;
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
      <div className="text-lg leading-none pt-0.5" aria-hidden>ℹ️</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-400">Sin datos bancarios importados</p>
        <p className="text-xs text-sp-admin-muted mt-1 leading-relaxed">
          Los datos de cobro y pago real se calculan con movimientos conciliados. Todavía no hay
          extractos bancarios importados, por lo que algunos indicadores de caja pueden aparecer a
          0. Los KPIs de facturación (facturado, gastado, pendiente) siguen siendo fiables.
        </p>
      </div>
    </div>
  );
}
