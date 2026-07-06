'use client';

import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AR_AGING_BUCKET_LABELS, type ArAgingBucket } from '@/types/arAging';

interface Props {
  readonly buckets: readonly ArAgingBucket[];
}

const EUR_COMPACT = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' });
const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const BUCKET_COLOR: Record<string, string> = {
  por_vencer: '#5b9bd5',
  '0-30':     '#f59e0b',
  '31-60':    '#d97706',
  '61-90':    '#e03070',
  '+90':      '#ef4444',
};

/**
 * Aging de cobros — barras por bucket. Enlace directo a la sección
 * de "Cobros pendientes" para el detalle.
 */
export function AgingChart({ buckets }: Props): React.ReactElement {
  const rows = buckets.map((b) => ({
    key: b.key,
    label: AR_AGING_BUCKET_LABELS[b.key],
    amount: b.amount,
    count: b.count,
  }));
  const hasData = rows.some((r) => r.amount > 0);

  return (
    <div className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-sp-admin-fg">Pendiente de cobro por antigüedad</h3>
        <Link
          href="/admin/finanzas/cobros"
          className="text-[11px] font-semibold text-sp-orange hover:opacity-80"
        >
          Ver detalle →
        </Link>
      </div>
      {!hasData ? (
        <div className="h-52 flex items-center justify-center text-xs text-sp-admin-muted italic">
          Sin cobros pendientes. Todo al día.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} />
            <YAxis tickFormatter={(v) => EUR_COMPACT.format(Number(v))} tick={{ fontSize: 10, fill: '#a8a39d' }} tickLine={false} width={54} />
            <Tooltip
              formatter={(value, _name, item) => {
                const payload = (item as { payload?: { count?: number } })?.payload;
                const cnt = payload?.count;
                return [
                  `${EUR.format(Number(value))}${cnt ? ` · ${cnt} factura${cnt === 1 ? '' : 's'}` : ''}`,
                  'Pendiente',
                ];
              }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2ddd8', fontSize: 12 }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {rows.map((r) => <Cell key={r.key} fill={BUCKET_COLOR[r.key] ?? '#6b7280'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
