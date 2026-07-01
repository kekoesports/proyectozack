import type { FinanzasResumenNominas } from '@/types/finanzasResumen';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

type Props = { readonly nominas: FinanzasResumenNominas };

export function ResumenNominasBlock({ nominas }: Props): React.ReactElement {
  if (nominas.count === 0) {
    return (
      <SectionCard title="Nóminas socios" subtitle="Nóminas registradas en el periodo">
        <p className="py-2 text-center text-sm text-sp-admin-muted">No hay nóminas registradas en este rango.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Nóminas socios" subtitle="Dinero que cobramos como socios de la empresa">
      <ul className="space-y-2">
        <Line label="Nóminas Pablo" amount={nominas.pablo} />
        <Line label="Nóminas Alfonso" amount={nominas.alfonso} />
        {nominas.otros > 0 && (
          <Line label="Nóminas (sin identificar)" amount={nominas.otros} muted />
        )}
        <li className="mt-2 flex items-baseline justify-between gap-3 border-t border-sp-admin-border/40 pt-2 text-sm">
          <span className="font-semibold text-sp-admin-fg">Total nóminas</span>
          <span className="tabular-nums font-black text-red-400">{EUR.format(nominas.total)}</span>
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
      <span className={`tabular-nums ${muted ? 'text-sp-admin-muted' : 'text-red-400'}`}>{EUR.format(amount)}</span>
    </li>
  );
}
