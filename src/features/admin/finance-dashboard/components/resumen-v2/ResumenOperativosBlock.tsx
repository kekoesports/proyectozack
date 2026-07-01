import type { FinanzasResumenOperativos } from '@/types/finanzasResumen';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

type Props = { readonly operativos: FinanzasResumenOperativos };

export function ResumenOperativosBlock({ operativos }: Props): React.ReactElement {
  if (operativos.count === 0) {
    return (
      <SectionCard title="Gastos operativos" subtitle="Gestoría, software, hosting, seguros, comisiones, marketing">
        <p className="py-2 text-center text-sm text-sp-admin-muted">No hay gastos operativos en este rango.</p>
      </SectionCard>
    );
  }

  const items: Array<[string, number]> = [
    ['Gestoría',            operativos.gestoria],
    ['Software / IA',       operativos.softwareIa],
    ['Hosting / dominio',   operativos.hostingDominio],
    ['Seguro médico',       operativos.seguroMedico],
    ['Comisiones bancarias', operativos.comisiones],
    ['Marketing',           operativos.marketing],
    ['Otros gastos',        operativos.otros],
  ];

  return (
    <SectionCard title="Gastos operativos" subtitle="Gastos reales de empresa (no nóminas ni impuestos)">
      <ul className="space-y-2">
        {items.map(([label, amount]) => amount > 0 && (
          <Line key={label} label={label} amount={amount} />
        ))}
        {operativos.sinClasificar > 0 && (
          <Line label="Sin clasificar" amount={operativos.sinClasificar} amber />
        )}
        <li className="mt-2 flex items-baseline justify-between gap-3 border-t border-sp-admin-border/40 pt-2 text-sm">
          <span className="font-semibold text-sp-admin-fg">Total gastos operativos</span>
          <span className="tabular-nums font-black text-red-400">{EUR.format(operativos.total)}</span>
        </li>
      </ul>
    </SectionCard>
  );
}

function Line({ label, amount, amber }: {
  readonly label: string;
  readonly amount: number;
  readonly amber?: boolean;
}): React.ReactElement {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className={amber ? 'text-amber-400' : 'text-sp-admin-fg'}>{label}</span>
      <span className={`tabular-nums ${amber ? 'text-amber-400' : 'text-red-400'}`}>{EUR.format(amount)}</span>
    </li>
  );
}
