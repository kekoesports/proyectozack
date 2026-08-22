import Link from 'next/link';
import { etiquetaCobertura, type EconomicaTalento } from '@/lib/finance/talentEconomics.shared';
import { TALENT_TAX_TYPE_LABELS, type TalentTaxType } from '@/lib/schemas/talentCompliance';

type Props = {
  readonly economica: EconomicaTalento;
  readonly taxType: string | null;
  readonly iaeActividad: string | null;
};

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const fmt = (n: number): string => EUR.format(n);

const CARD = 'rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5';
const ETIQUETA = 'text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted';

function Cifra({
  valor,
  etiqueta,
  nota,
  tono,
}: {
  readonly valor: string;
  readonly etiqueta: string;
  readonly nota?: string;
  readonly tono?: 'normal' | 'apagado';
}): React.ReactElement {
  return (
    <div>
      <p className={`text-2xl font-bold tabular-nums ${tono === 'apagado' ? 'text-sp-admin-muted' : 'text-sp-admin-text'}`}>
        {valor}
      </p>
      <p className="text-xs text-sp-admin-muted">{etiqueta}</p>
      {nota !== undefined && <p className="text-[11px] text-sp-admin-muted mt-0.5">{nota}</p>}
    </div>
  );
}

/**
 * Pestaña "Economía" de la ficha del talento.
 *
 * Separa dos cosas que el CRM mezclaba: lo **pactado** en sus campañas
 * (`amountBrand`/`amountTalent`, que es previsión) y lo **pagado** de verdad
 * (facturas). Un talento puede tener 46.825 € de tratos presupuestados y
 * 1.060 € cobrados, y las dos cifras son ciertas.
 *
 * El margen solo aparece si hay facturas con las que calcularlo, y siempre
 * dice sobre cuántas campañas se ha hecho. Es la distinción de FV.7 entre
 * "limpio" y "no evaluable", aplicada a una persona.
 *
 * @kind server
 * @feature admin/talents
 * @route /admin/talents/[id]
 */
export function TalentEconomiaTab({ economica, taxType, iaeActividad }: Props): React.ReactElement {
  const { pagado, retenido, pagos, ultimoPago, presupuesto, deals, cobertura, margen } = economica;

  return (
    <div className="space-y-4">
      {/* Lo que se le ha pagado */}
      <section className={CARD}>
        <h3 className="text-sm font-bold text-sp-admin-text mb-3">Lo que ha cobrado</h3>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Cifra
            valor={fmt(pagado)}
            etiqueta="pagado"
            nota={pagos === 0 ? 'ningún pago registrado' : `${pagos} pago${pagos === 1 ? '' : 's'}${ultimoPago !== null ? ` · último ${ultimoPago}` : ''}`}
          />
          <Cifra
            valor={fmt(retenido)}
            etiqueta="IRPF retenido"
            nota={retenido > 0 ? 'a ingresar en el modelo 111' : 'sus facturas no llevan retención'}
            tono={retenido > 0 ? 'normal' : 'apagado'}
          />
          <Cifra valor={String(deals.total)} etiqueta={deals.total === 1 ? 'campaña' : 'campañas'} />
        </div>
        {deals.total > 0 && (
          <p className="mt-3 text-xs text-sp-admin-muted">
            {deals.porEstado.map((d) => `${d.n} ${d.estado}`).join(' · ')}
          </p>
        )}
      </section>

      {/* Pactado vs pagado */}
      <section className={CARD}>
        <h3 className="text-sm font-bold text-sp-admin-text mb-1">Pactado en sus campañas</h3>
        <p className="text-xs text-sp-admin-muted mb-3 max-w-2xl">
          Es el presupuesto acordado, no dinero que se haya movido. Se enseña aparte de lo cobrado
          justamente porque las dos cifras suelen no parecerse.
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Cifra valor={fmt(presupuesto.marca)} etiqueta="lo que paga la marca" />
          <Cifra valor={fmt(presupuesto.talento)} etiqueta="lo que le corresponde a él" />
        </div>
      </section>

      {/* Rentabilidad */}
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-sp-admin-text">Rentabilidad</h3>
          <span className="text-[11px] text-sp-admin-muted">{etiquetaCobertura(cobertura)}</span>
        </div>

        {margen.estado === 'no-evaluable' ? (
          <p className="text-xs text-sp-admin-muted max-w-2xl border-l-2 border-sp-admin-border pl-3">
            <strong className="text-sp-admin-text">No se puede calcular todavía.</strong> {margen.motivo}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Cifra valor={fmt(margen.ingreso)} etiqueta="facturado a marcas" />
              <Cifra valor={fmt(margen.coste)} etiqueta="coste de esas campañas" />
              <Cifra
                valor={`${fmt(margen.margen)}${margen.margenPct !== null ? ` · ${margen.margenPct}%` : ''}`}
                etiqueta="margen"
              />
            </div>
            {margen.estado === 'parcial' && (
              <p className="mt-3 text-xs text-amber-500 max-w-2xl">
                Calculado sobre {margen.sobre.conFactura} de sus {margen.sobre.total} campañas — las
                únicas con facturas enlazadas. Las otras {margen.sobre.total - margen.sobre.conFactura} no
                entran en esta cifra ni para bien ni para mal.
              </p>
            )}
          </>
        )}

        {cobertura.cerradasSinFactura > 0 && (
          <p className="mt-3 text-xs text-amber-500 max-w-2xl">
            {cobertura.cerradasSinFactura}{' '}
            {cobertura.cerradasSinFactura === 1 ? 'campaña suya está cerrada' : 'campañas suyas están cerradas'}{' '}
            (pagada o completada) sin ninguna factura enlazada. Ahí hubo dinero que no está en la
            contabilidad.{' '}
            <Link href="/admin/finanzas/salud" className="underline hover:text-sp-admin-text">
              Ver salud del dato
            </Link>
          </p>
        )}
      </section>

      {/* Perfil fiscal */}
      <section className={CARD}>
        <h3 className="text-sm font-bold text-sp-admin-text mb-3">Cómo tributa</h3>
        {taxType === null ? (
          <p className="text-xs text-sp-admin-muted max-w-2xl">
            Sin tipo fiscal anotado. Hasta rellenarlo no se puede comprobar si sus facturas llevan la
            retención que les corresponde — se hace en la pestaña <strong>Compliance</strong>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <p className={ETIQUETA}>Tipo fiscal</p>
              <p className="text-sm text-sp-admin-text">
                {TALENT_TAX_TYPE_LABELS[taxType as TalentTaxType] ?? taxType}
              </p>
            </div>
            {iaeActividad !== null && (
              <div>
                <p className={ETIQUETA}>Sección IAE</p>
                <p className="text-sm text-sp-admin-text">{iaeActividad}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
