import type { FinanzasResumenImpuestos } from '@/types/finanzasResumen';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

type Props = { readonly impuestos: FinanzasResumenImpuestos };

export function ResumenImpuestosBlock({ impuestos }: Props): React.ReactElement {
  if (impuestos.count === 0) {
    return (
      <SectionCard title="Impuestos y cargas" subtitle="Autónomos, Seguridad Social, fiscal">
        <p className="py-2 text-center text-sm text-sp-admin-muted">No hay impuestos ni cargas registradas.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Impuestos y cargas" subtitle="Autónomos, Seguridad Social, fiscal">
      <ul className="space-y-2">
        {impuestos.cuotaAutonomoPablo > 0 && (
          <Line label="Cuota autónomo Pablo" amount={impuestos.cuotaAutonomoPablo} />
        )}
        {impuestos.cuotaAutonomoAlfonso > 0 && (
          <Line label="Cuota autónomo Alfonso" amount={impuestos.cuotaAutonomoAlfonso} />
        )}
        {impuestos.cuotaAutonomoOtros > 0 && (
          <Line label="Cuota autónomo (sin identificar)" amount={impuestos.cuotaAutonomoOtros} muted />
        )}
        {impuestos.seguridadSocial > 0 && (
          <Line label="Seguridad Social" amount={impuestos.seguridadSocial} />
        )}
        {impuestos.fiscal > 0 && (
          <Line label="Fiscal / impuestos" amount={impuestos.fiscal} />
        )}
        <li className="mt-2 flex items-baseline justify-between gap-3 border-t border-sp-admin-border/40 pt-2 text-sm">
          <span className="font-semibold text-sp-admin-fg">Total impuestos y cargas</span>
          <span className="tabular-nums font-black text-orange-400">{EUR.format(impuestos.total)}</span>
        </li>
      </ul>
    </SectionCard>
  );
}

function Line({ label, amount, muted }: {
  readonly label: string;
  readonly amount: number;
  readonly muted?: boolean;
}): React.ReactElement {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className={muted ? 'text-sp-admin-muted' : 'text-sp-admin-fg'}>{label}</span>
      <span className={`tabular-nums ${muted ? 'text-sp-admin-muted' : 'text-orange-400'}`}>{EUR.format(amount)}</span>
    </li>
  );
}
