import { AR_AGING_BUCKET_LABELS, type ArAgingRow } from '@/types/arAging';
import { humanStatusLabel } from '@/lib/queries/financeDashboard/arAging.shared';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const DATE_FMT = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return DATE_FMT.format(new Date(y, m - 1, d));
}

function formatMoney(amount: number, currency: string): string {
  if (currency === 'EUR') return EUR.format(amount);
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function daysLabel(daysOverdue: number): string {
  if (daysOverdue < 0) return `en ${-daysOverdue} d`;
  if (daysOverdue === 0) return 'hoy';
  return `${daysOverdue} d`;
}

function bucketBadgeClass(bucket: ArAgingRow['bucket']): string {
  switch (bucket) {
    case 'por_vencer': return 'border-emerald-500/40 text-emerald-400';
    case '0-30':      return 'border-amber-500/40 text-amber-400';
    case '31-60':     return 'border-orange-500/40 text-orange-400';
    case '61-90':     return 'border-red-500/40 text-red-400';
    case '+90':       return 'border-red-600/60 text-red-400';
  }
}

function statusBadgeClass(label: string): string {
  if (label === 'Vencida') return 'border-red-500/40 text-red-400';
  if (label === 'Pagada parcial') return 'border-amber-500/40 text-amber-400';
  return 'border-sp-admin-border text-sp-admin-muted';
}

type Props = {
  readonly rows: readonly ArAgingRow[];
};

export function ArAgingTable({ rows }: Props): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card px-5 py-8 text-center text-sm text-sp-admin-muted">
        No hay cobros pendientes con los filtros aplicados
      </div>
    );
  }

  const headers = [
    'Marca / Cliente',
    'Factura',
    'Entidad',
    'Importe',
    'Pagado',
    'Pendiente',
    'Emisión',
    'Vencimiento',
    'Días de retraso',
    'Bucket',
    'Estado',
    'PDF',
  ];

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <div className="border-b border-sp-admin-border px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Facturas pendientes
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const primary = row.brandName ?? row.clientName ?? '—';
              const secondary = row.brandName && row.clientName && row.brandName !== row.clientName
                ? row.clientName
                : null;
              const statusLabel = humanStatusLabel(row.status, row.bucket);

              return (
                <tr
                  key={`${row.source}-${row.id}`}
                  className="border-b border-sp-admin-border/50 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2 text-sp-admin-fg">
                    <div className="font-medium">{primary}</div>
                    {secondary && (
                      <div className="text-xs text-sp-admin-muted">{secondary}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-sp-admin-fg whitespace-nowrap">
                    {row.invoiceNumber}
                    {row.source === 'issued' && (
                      <span className="ml-1 text-[9px] text-sp-admin-muted">EMI</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sp-admin-muted whitespace-nowrap">
                    {row.entity ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-sp-admin-fg whitespace-nowrap">
                    {formatMoney(row.totalAmount, row.currency)}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-400 whitespace-nowrap">
                    {row.paidAmount > 0 ? formatMoney(row.paidAmount, row.currency) : <span className="text-sp-admin-muted">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-amber-400 whitespace-nowrap">
                    {formatMoney(row.pendingAmount, row.currency)}
                  </td>
                  <td className="px-3 py-2 text-sp-admin-muted whitespace-nowrap">
                    {formatDate(row.issueDate)}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap ${row.bucket !== 'por_vencer' ? 'text-red-400' : 'text-sp-admin-muted'}`}>
                    <div>{formatDate(row.effectiveDueDate)}</div>
                    {row.isEstimatedDueDate && (
                      <div className="text-[10px] italic text-sp-admin-muted">
                        Vencimiento estimado
                      </div>
                    )}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap tabular-nums ${row.bucket !== 'por_vencer' ? 'text-red-400' : 'text-sp-admin-muted'}`}>
                    {daysLabel(row.daysOverdue)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${bucketBadgeClass(row.bucket)}`}>
                      {AR_AGING_BUCKET_LABELS[row.bucket]}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusBadgeClass(statusLabel)}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.pdfUrl ? (
                      <a
                        href={row.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sp-blue underline-offset-2 hover:underline"
                      >
                        Ver PDF
                      </a>
                    ) : (
                      <span className="text-xs text-sp-admin-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
