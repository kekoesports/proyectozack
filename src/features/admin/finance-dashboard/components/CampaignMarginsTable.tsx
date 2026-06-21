'use client';

import type { CampaignMarginRow } from '@/types/financeDashboard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type Props = {
  readonly rows: readonly CampaignMarginRow[];
};

export function CampaignMarginsTable({ rows }: Props): React.ReactElement {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card px-5 py-8 text-center text-sm text-sp-admin-muted">
        No hay campañas activas
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <div className="border-b border-sp-admin-border px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Márgenes campañas · presupuesto estimado
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border">
              {['Campaña', 'Marca', 'Talento', 'Presup. marca', 'Presup. talento', 'Margen', 'Cobro', 'Pago talent'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-sp-admin-border/50 last:border-0 hover:bg-white/[0.02]"
              >
                <td className="max-w-[160px] truncate px-4 py-2 font-medium text-sp-admin-fg">
                  {row.isLow && <span className="mr-1 text-amber-400">⚠</span>}
                  {row.name}
                </td>
                <td className="px-4 py-2 text-sp-admin-muted">
                  {row.brandName ?? '—'}
                </td>
                <td className="px-4 py-2 text-sp-admin-muted">
                  {row.talentName ?? '—'}
                </td>
                <td className="px-4 py-2 text-right text-sp-admin-fg">
                  {EUR.format(row.amountBrand)}
                </td>
                <td className="px-4 py-2 text-right text-sp-admin-fg">
                  {EUR.format(row.amountTalent)}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${row.isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {row.computedMarginPct !== null ? `${row.computedMarginPct.toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${row.cobroConfirmado ? 'bg-emerald-400' : 'bg-sp-admin-border'}`}
                    title={row.cobroConfirmado ? 'Cobro confirmado' : 'Pendiente cobro'}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${row.pagoTalentConfirmado ? 'bg-emerald-400' : 'bg-sp-admin-border'}`}
                    title={row.pagoTalentConfirmado ? 'Pago confirmado' : 'Pendiente pago'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
