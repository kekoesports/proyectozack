import type {
  FinanzasResumenImpuestos,
  FinanzasResumenMargenBruto,
  FinanzasResumenNominas,
  FinanzasResumenOperativos,
  FinanzasResumenResultado,
} from '@/types/finanzasResumen';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

type Props = {
  readonly margenBruto: FinanzasResumenMargenBruto;
  readonly nominas:     FinanzasResumenNominas;
  readonly impuestos:   FinanzasResumenImpuestos;
  readonly operativos:  FinanzasResumenOperativos;
  readonly resultado:   FinanzasResumenResultado;
};

export function ResumenResultadoBlock({ margenBruto, nominas, impuestos, operativos, resultado }: Props): React.ReactElement {
  const positive = resultado.operativo >= 0;
  const bigColor = positive ? 'text-emerald-400' : 'text-red-400';
  const borderColor = positive ? 'border-emerald-500/40' : 'border-red-500/40';

  return (
    <SectionCard title="Resultado operativo" subtitle="Lo que queda después de nóminas, impuestos y gastos operativos">
      <div className={`rounded-xl border ${borderColor} bg-sp-admin-card p-5`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sp-admin-muted">
            Resultado operativo (base caja)
          </span>
          <span className={`text-4xl font-black tabular-nums ${bigColor}`}>
            {EUR.format(resultado.operativo)}
          </span>
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-sp-admin-border/60">
        <summary className="cursor-pointer list-none px-4 py-2 text-xs text-sp-admin-muted hover:text-sp-admin-fg">
          Ver cómo se calcula
        </summary>
        <ul className="space-y-1.5 px-4 py-3 text-xs">
          <FormulaRow label="Margen bruto cobrado" amount={margenBruto.cobrado} sign="+" />
          <FormulaRow label="Nóminas socios"       amount={nominas.total}       sign="−" />
          <FormulaRow label="Impuestos y cargas"   amount={impuestos.total}     sign="−" />
          <FormulaRow label="Gastos operativos"    amount={operativos.total}    sign="−" />
          <li className="mt-2 flex items-baseline justify-between gap-3 border-t border-sp-admin-border/40 pt-2 text-sm">
            <span className="font-semibold text-sp-admin-fg">= Resultado operativo</span>
            <span className={`tabular-nums font-black ${bigColor}`}>{EUR.format(resultado.operativo)}</span>
          </li>
        </ul>
      </details>
    </SectionCard>
  );
}

function FormulaRow({ label, amount, sign }: {
  readonly label: string;
  readonly amount: number;
  readonly sign: '+' | '−';
}): React.ReactElement {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-sp-admin-fg">
        <span className="mr-2 inline-block w-3 text-center text-sp-admin-muted">{sign}</span>
        {label}
      </span>
      <span className="tabular-nums text-sp-admin-fg">{EUR.format(amount)}</span>
    </li>
  );
}
