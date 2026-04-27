import { KpiCard } from '@/components/admin/ui/KpiCard';

type Props = {
  readonly pendingBrandTotal: number;
  readonly pendingTalentTotal: number;
};

function formatEur(amount: number): string {
  return amount.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + ' €';
}

export function PendingPaymentsWidget({ pendingBrandTotal, pendingTalentTotal }: Props): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <KpiCard
        title="Cobros pendientes"
        value={formatEur(pendingBrandTotal)}
        subtitle="Marcas — facturas income sin cobrar"
        tone={pendingBrandTotal > 0 ? 'warning' : 'neutral'}
        href="/admin/facturacion?kind=income&status=emitida"
      />
      <KpiCard
        title="Pagos a creadores"
        value={formatEur(pendingTalentTotal)}
        subtitle="Influencers — facturas expense sin pagar"
        tone={pendingTalentTotal > 0 ? 'warning' : 'neutral'}
        href="/admin/facturacion?kind=expense&status=emitida"
      />
    </div>
  );
}
