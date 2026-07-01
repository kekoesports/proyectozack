import type { FinanzasResumenCostesDirectos, FinanzasResumenMargenBruto } from '@/types/finanzasResumen';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

type Props = {
  readonly costesDirectos: FinanzasResumenCostesDirectos;
  readonly margenBruto:    FinanzasResumenMargenBruto;
};

export function ResumenCostesMargenBlock({ costesDirectos, margenBruto }: Props): React.ReactElement {
  return (
    <SectionCard title="Costes directos de campaña + Margen bruto" subtitle="Lo que pagamos a talentos y produce cada trato, y el margen que queda">
      <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">
            Costes directos
          </p>
          <LineRow label="Pagos a talentos (pagados)" amount={costesDirectos.pagosTalento.pagados} accent="expense" />
          <LineRow label="Pagos a talentos (pendientes)" amount={costesDirectos.pagosTalento.pendientes} accent="warn" />
          {(costesDirectos.costesProduccion.pagados > 0 || costesDirectos.costesProduccion.pendientes > 0) && (
            <>
              <LineRow label="Costes producción (pagados)" amount={costesDirectos.costesProduccion.pagados} accent="expense" />
              <LineRow label="Costes producción (pendientes)" amount={costesDirectos.costesProduccion.pendientes} accent="warn" />
            </>
          )}
          <div className="mt-2 border-t border-sp-admin-border/40 pt-2">
            <LineRow label="Total costes directos" amount={costesDirectos.total} accent="expense" strong />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">
            Margen bruto
          </p>
          <LineRow
            label="Margen bruto cobrado"
            amount={margenBruto.cobrado}
            accent={margenBruto.cobrado >= 0 ? 'income' : 'expense'}
            strong
          />
          <p className="text-[10px] italic text-sp-admin-muted">
            = ingresos cobrados − costes directos pagados
          </p>
          <LineRow
            label="Margen bruto pendiente (estimado)"
            amount={margenBruto.pendiente}
            accent={margenBruto.pendiente >= 0 ? 'warn' : 'expense'}
          />
          <p className="text-[10px] italic text-sp-admin-muted">
            = pendiente cobrar − pendiente pagar directo
          </p>
        </div>
      </dl>
    </SectionCard>
  );
}

type Accent = 'income' | 'expense' | 'warn' | 'neutral';

function LineRow({ label, amount, accent, strong }: {
  readonly label: string;
  readonly amount: number;
  readonly accent: Accent;
  readonly strong?: boolean;
}): React.ReactElement {
  const color =
    accent === 'income'  ? 'text-emerald-400'
    : accent === 'expense' ? 'text-red-400'
    : accent === 'warn'  ? 'text-amber-400'
    :                       'text-sp-admin-fg';

  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className={strong ? 'font-semibold text-sp-admin-fg' : 'text-sp-admin-fg'}>{label}</span>
      <span className={`tabular-nums ${color} ${strong ? 'font-black' : ''}`}>{EUR.format(amount)}</span>
    </div>
  );
}
