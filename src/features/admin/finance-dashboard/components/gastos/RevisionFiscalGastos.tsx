import Link from 'next/link';
import type { RevisionGastos } from '@/lib/finance/expenseReview';
import type { TalentoSinPerfil } from '@/lib/finance/expenseAssistant';
import { TALENT_TAX_TYPE_LABELS, type TalentTaxType } from '@/lib/schemas/talentCompliance';

type Props = {
  readonly revision: RevisionGastos;
  readonly talentos: readonly TalentoSinPerfil[];
};

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const fmt = (n: number): string => EUR.format(n);

const CARD = 'rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5';
const TH = 'text-left text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted pb-2';

function etiquetaTipo(t: string | null): string {
  if (t === null) return 'sin definir';
  return TALENT_TAX_TYPE_LABELS[t as TalentTaxType] ?? t;
}

/**
 * FV.5 — qué gastos del período tienen algo que revisar fiscalmente.
 *
 * El orden de los bloques no es estético: lo primero es lo que **no se ha
 * podido comprobar**, porque un panel que solo enseña contradicciones deja
 * creer que el resto está verificado. Aquí lo no verificable va delante, con su
 * importe, y las contradicciones detectadas después.
 *
 * @kind server
 * @feature admin/finance-dashboard
 * @route /admin/finanzas/gastos/revision
 */
export function RevisionFiscalGastos({ revision, talentos }: Props): React.ReactElement {
  const { conAvisos, sinTalento, sinValidar, resumen, total } = revision;
  const todoComprobado = conAvisos.length === 0 && sinTalento.gastos === 0 && sinValidar.gastos === 0;

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <p className="text-2xl font-bold text-sp-admin-text">{total}</p>
            <p className="text-xs text-sp-admin-muted">gastos en el período</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-sp-admin-text">{conAvisos.length}</p>
            <p className="text-xs text-sp-admin-muted">con una contradicción concreta</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500">{sinTalento.gastos + sinValidar.gastos}</p>
            <p className="text-xs text-sp-admin-muted">que no se han podido comprobar</p>
          </div>
          {resumen.info > 0 && (
            <div>
              <p className="text-2xl font-bold text-sp-admin-muted">{resumen.info}</p>
              <p className="text-xs text-sp-admin-muted">correctos con nota (ISP, periodificar)</p>
            </div>
          )}
        </div>
      </section>

      {/* Lo que no se ha podido comprobar — va primero a propósito */}
      {sinTalento.gastos > 0 && (
        <section aria-labelledby="sin-ficha-title" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h2 id="sin-ficha-title" className="text-sm font-bold text-amber-500">
            {sinTalento.gastos} pagos a talento sin ficha vinculada · {fmt(sinTalento.importe)}
          </h2>
          <p className="text-xs text-sp-admin-muted mt-1 mb-4 max-w-3xl">
            Estas facturas no apuntan a ningún talento, así que no hay perfil fiscal contra el que
            contrastarlas: no se puede decir si la retención que llevan es la que les toca. Rellenar
            fichas no las arregla — hay que vincular cada factura a su talento.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Proveedor</th>
                  <th className={TH}>Concepto</th>
                  <th className={`${TH} text-right`}>Importe</th>
                </tr>
              </thead>
              <tbody className="text-sp-admin-text">
                {sinTalento.filas.map((f) => (
                  <tr key={f.id} className="border-t border-sp-admin-border/50">
                    <td className="py-2 pr-3 whitespace-nowrap text-sp-admin-muted">{f.issueDate}</td>
                    <td className="py-2 pr-3">{f.counterpartyName ?? '—'}</td>
                    <td className="py-2 pr-3 text-sp-admin-muted">{f.concept}</td>
                    <td className="py-2 text-right whitespace-nowrap tabular-nums">
                      {fmt(f.totalEur)}
                      {f.currency !== 'EUR' && (
                        <span className="text-[11px] text-sp-admin-muted ml-1">({f.currency})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Fichas a medias */}
      {talentos.length > 0 && (
        <section aria-labelledby="fichas-title" className={CARD}>
          <h2 id="fichas-title" className="text-sm font-bold text-sp-admin-text">
            {talentos.length} fichas con el perfil fiscal a medias
          </h2>
          <p className="text-xs text-sp-admin-muted mt-1 mb-4 max-w-3xl">
            Cada ficha que se completa silencia el aviso de todas sus facturas, las de este año y
            las que vengan. La sugerencia sale del país anotado y es un punto de partida, no la
            respuesta: hay que confirmarla.
            {sinValidar.gastos > 0 && (
              <> Ahora mismo dejan {sinValidar.gastos} gastos sin comprobar.</>
            )}
          </p>
          <ul className="space-y-2">
            {talentos.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-sp-admin-border/50 pt-2 text-sm">
                <Link
                  href={`/admin/talents/${t.id}`}
                  className="font-semibold text-sp-admin-text hover:text-sp-admin-accent transition-colors"
                >
                  {t.nombre}
                </Link>
                <span className="text-xs text-sp-admin-muted">falta {t.falta}</span>
                <span className="text-xs text-sp-admin-muted">· país {t.pais ?? '—'}</span>
                {t.sugerencia !== null && (
                  <span className="text-xs text-sp-admin-accent">
                    · sugerencia: {etiquetaTipo(t.sugerencia)}
                  </span>
                )}
                <span className="ml-auto text-xs text-sp-admin-muted tabular-nums">
                  {t.pagos} pago{t.pagos === 1 ? '' : 's'} · {fmt(t.pagado)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Contradicciones detectadas */}
      <section aria-labelledby="avisos-title" className={CARD}>
        <h2 id="avisos-title" className="text-sm font-bold text-sp-admin-text mb-3">
          Contradicciones entre la factura y el perfil
        </h2>
        {conAvisos.length === 0 ? (
          <p className="text-xs text-sp-admin-muted max-w-3xl">
            Ninguna entre las facturas que sí se pueden contrastar. No quiere decir que el resto
            esté bien: quiere decir que a las de arriba les falta el dato con el que compararlas.
          </p>
        ) : (
          <ul className="space-y-3">
            {conAvisos.map((g) => (
              <li key={g.id} className="border-t border-sp-admin-border/50 pt-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm font-semibold text-sp-admin-text">
                    {g.counterpartyName ?? '—'}
                  </span>
                  <span className="text-xs text-sp-admin-muted">{g.issueDate}</span>
                  <span className="text-xs text-sp-admin-muted">{g.concept}</span>
                  <span className="ml-auto text-sm tabular-nums text-sp-admin-text">
                    {fmt(g.totalEur)}
                  </span>
                </div>
                <ul className="mt-1 space-y-1">
                  {g.avisos.map((a) => (
                    <li key={a.codigo} className="text-xs">
                      <span className={a.nivel === 'error' ? 'text-red-400' : a.nivel === 'aviso' ? 'text-amber-500' : 'text-sp-admin-muted'}>
                        {a.nivel === 'error' ? '✖' : a.nivel === 'aviso' ? '▲' : 'ℹ'} {a.titulo}
                      </span>
                      <span className="text-sp-admin-muted"> — {a.detalle}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-sp-admin-muted tabular-nums">
                  Baja el resultado {fmt(g.efecto.reduceResultado)} · se paga {fmt(g.efecto.sePaga)}
                  {g.efecto.recuperaIva > 0 && <> · IVA a recuperar {fmt(g.efecto.recuperaIva)}</>}
                  {g.efecto.retencionAIngresar > 0 && <> · retención a ingresar {fmt(g.efecto.retencionAIngresar)}</>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lo que esta pantalla NO comprueba */}
      <section className="rounded-2xl border border-sp-admin-border/60 p-4">
        <h2 className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-2">
          Qué no se comprueba aquí
        </h2>
        <p className="text-xs text-sp-admin-muted max-w-3xl">
          Si la factura va a nombre de la sociedad o a nombre personal, y si trae NIF. Ninguno de
          los dos datos se guarda al registrar el gasto, así que no se puede verificar sin el PDF
          delante. Por eso el contador de bloqueos de deducibilidad sale a cero: no es que no
          existan, es que no se han mirado.
        </p>
      </section>

      {todoComprobado && (
        <p className="text-xs text-emerald-500">
          Todos los gastos del período se han podido contrastar y ninguno contradice su perfil.
        </p>
      )}
    </div>
  );
}
