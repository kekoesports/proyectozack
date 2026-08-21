import {
  etiquetaSaldoIva,
  proporcionSinIva,
  signoSaldoIva,
  type TaxPeriodSummary,
} from '@/lib/finance/tax.shared';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

type Props = { readonly tax: TaxPeriodSummary };

/**
 * IVA y retenciones del periodo: cuánto de lo que entra y sale no es vuestro.
 */
export function ResumenIvaBlock({ tax }: Props): React.ReactElement {
  const saldo = etiquetaSaldoIva(tax.saldoIva);
  const signo = signoSaldoIva(tax.saldoIva);
  const pctSinIva = proporcionSinIva(tax.gastosSinIva, tax.gastosTotales);

  const colorSaldo =
    signo === 'a-favor' ? 'text-emerald-400'
    : signo === 'a-ingresar' ? 'text-amber-400'
    : 'text-sp-admin-fg';

  return (
    <SectionCard title="IVA y retenciones" subtitle="Lo que pasa por vuestra cuenta pero no es vuestro">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border/60 p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
            IVA repercutido
          </dt>
          <dd className="text-2xl font-black tabular-nums">{EUR.format(tax.ivaRepercutido)}</dd>
          <dd className="text-[10px] text-sp-admin-muted">Cobrado a clientes</dd>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border/60 p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
            IVA soportado
          </dt>
          <dd className="text-2xl font-black tabular-nums">{EUR.format(tax.ivaSoportado)}</dd>
          <dd className="text-[10px] text-sp-admin-muted">Pagado a proveedores</dd>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-sp-admin-border/60 p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
            Saldo del periodo
          </dt>
          <dd className={`text-2xl font-black tabular-nums ${colorSaldo}`}>
            {EUR.format(saldo.importe)}
          </dd>
          <dd className="text-[10px] text-sp-admin-muted">{saldo.texto}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-col gap-2">
        <p className="text-sm text-sp-admin-muted">
          Retenciones practicadas a terceros:{' '}
          <strong className="text-sp-admin-fg tabular-nums">
            {EUR.format(tax.retencionesPracticadas)}
          </strong>{' '}
          — es lo que se ingresa por el modelo 111. No reduce vuestro resultado.
        </p>

        {signo === 'a-favor' && (
          <p className="text-[11px] text-sp-admin-muted">
            Esto es el IVA <strong>soportado</strong>, no el deducible. Una factura a
            nombre personal o sin el NIF de la sociedad no se puede deducir, así que lo
            que finalmente entre en el 303 puede ser menor. La gestoría tiene la última
            palabra.
          </p>
        )}
      </div>

      {tax.gastosTotales > 0 && tax.gastosSinIva > 0 && (
        <p className="mt-2 text-[11px] text-sp-admin-muted">
          {tax.gastosSinIva} de {tax.gastosTotales} gastos ({pctSinIva}%) van sin IVA. Puede
          ser correcto — las compras con inversión del sujeto pasivo lo llevan a 0 — o ser
          un importe sin desglosar.
        </p>
      )}

      {tax.ivaSoportado === 0 && tax.ivaRepercutido === 0 && (
        <p className="mt-2 text-[11px] text-amber-300">
          No hay IVA desglosado en los movimientos del periodo. Mientras los gastos se
          registren con el importe total y el IVA a 0, este panel no puede decir nada.
        </p>
      )}
    </SectionCard>
  );
}
