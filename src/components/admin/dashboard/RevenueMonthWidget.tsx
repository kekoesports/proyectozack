import { KpiCard } from '@/components/admin/ui/KpiCard';

const EUR_FORMATTER = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type Props = {
  readonly amount: number;
  readonly previousAmount?: number;
};

export function RevenueMonthWidget({ amount, previousAmount }: Props): React.ReactElement {
  const formatted = EUR_FORMATTER.format(amount);
  let subtitle: string | undefined;
  let tone: 'success' | 'warning' | 'neutral' = amount > 0 ? 'success' : 'neutral';

  if (typeof previousAmount === 'number' && previousAmount > 0) {
    const delta = amount - previousAmount;
    const pct = Math.round((delta / previousAmount) * 100);
    const sign = delta >= 0 ? '+' : '';
    subtitle = `${sign}${pct}% vs mes anterior`;
    if (delta < 0) tone = 'warning';
  } else if (previousAmount === 0 && amount > 0) {
    subtitle = 'Primer mes con ingresos';
  }

  return (
    <KpiCard
      title="Facturación del mes"
      value={formatted}
      {...(subtitle ? { subtitle } : {})}
      tone={tone}
      href="/admin/facturacion"
    />
  );
}
