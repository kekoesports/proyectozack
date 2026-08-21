import type { Chequeo, SaludDelDato } from '@/lib/finance/dataHealth';

type Props = {
  readonly salud: SaludDelDato;
};

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const fmt = (n: number | null): string => (n === null ? '—' : EUR.format(n));

const ESTILO_ESTADO: Readonly<Record<Chequeo['estado'], string>> = {
  limpio: 'border-emerald-500/25 bg-emerald-500/5',
  'con-hallazgos': 'border-amber-500/30 bg-amber-500/5',
  'no-evaluable': 'border-sp-admin-border bg-sp-admin-card',
};

const ICONO: Readonly<Record<Chequeo['estado'], string>> = {
  limpio: '✔',
  'con-hallazgos': '▲',
  'no-evaluable': '?',
};

const ETIQUETA_SEVERIDAD: Readonly<Record<Chequeo['severidad'], string>> = {
  cuentas: 'descuadra cuentas',
  higiene: 'higiene del dato',
  esperado: 'sale por diseño',
};

function ChequeoCard({ c }: { readonly c: Chequeo }): React.ReactElement {
  return (
    <section className={`rounded-2xl border p-5 ${ESTILO_ESTADO[c.estado]}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span aria-hidden className="text-sm">{ICONO[c.estado]}</span>
        <h3 className="text-sm font-bold text-sp-admin-text">{c.titulo}</h3>
        <span className="text-[11px] uppercase tracking-wider text-sp-admin-muted">
          {ETIQUETA_SEVERIDAD[c.severidad]}
        </span>
        {c.estado === 'con-hallazgos' && (
          <span className="ml-auto text-sm tabular-nums text-sp-admin-text">
            {c.totalFilas} · {fmt(c.importe)}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-sp-admin-muted max-w-3xl">{c.explicacion}</p>

      {c.estado === 'no-evaluable' && (
        <p className="mt-2 text-xs text-sp-admin-muted max-w-3xl border-l-2 border-sp-admin-border pl-3">
          <strong className="text-sp-admin-text">No se puede comprobar todavía.</strong>{' '}
          {c.porQueNoEvaluable}
        </p>
      )}

      {c.estado === 'con-hallazgos' && (
        <>
          <ul className="mt-3 space-y-1">
            {c.filas.map((f) => (
              <li key={f.id} className="flex flex-wrap items-baseline gap-x-3 text-xs border-t border-sp-admin-border/50 pt-1">
                <span className="text-sp-admin-text">{f.etiqueta}</span>
                {f.detalle !== null && <span className="text-sp-admin-muted">{f.detalle}</span>}
                <span className="ml-auto tabular-nums text-sp-admin-muted">{fmt(f.importe)}</span>
              </li>
            ))}
          </ul>
          {c.totalFilas > c.filas.length && (
            <p className="mt-2 text-[11px] text-sp-admin-muted">
              Se listan las {c.filas.length} de mayor importe de {c.totalFilas}.
            </p>
          )}
          {c.queHacer !== undefined && (
            <p className="mt-2 text-xs text-sp-admin-accent">{c.queHacer}</p>
          )}
        </>
      )}
    </section>
  );
}

/**
 * FV.7 — panel de salud del dato financiero.
 *
 * Un chequeo sin filas puede significar dos cosas opuestas: que está limpio o
 * que no se ha podido mirar. El panel las pinta distinto y explica la segunda,
 * porque un "0" sin contexto se lee siempre como la buena.
 *
 * @kind server
 * @feature admin/finance-dashboard
 * @route /admin/finanzas/salud
 */
export function SaludDelDatoPanel({ salud }: Props): React.ReactElement {
  const { resumen, chequeos } = salud;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <p className="text-2xl font-bold text-sp-admin-text tabular-nums">
              {fmt(resumen.importeEnJuego)}
            </p>
            <p className="text-xs text-sp-admin-muted">en movimientos que descuadran cuentas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-500 tabular-nums">{resumen.limpios}</p>
            <p className="text-xs text-sp-admin-muted">chequeos limpios</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500 tabular-nums">{resumen.conHallazgos}</p>
            <p className="text-xs text-sp-admin-muted">con algo que mirar</p>
          </div>
          {resumen.noEvaluables > 0 && (
            <div>
              <p className="text-2xl font-bold text-sp-admin-muted tabular-nums">{resumen.noEvaluables}</p>
              <p className="text-xs text-sp-admin-muted">sin poder comprobar</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-sp-admin-muted max-w-3xl">
          La cifra de arriba no incluye la higiene del dato ni lo que sale por diseño. Si lo
          incluyera nunca bajaría de ahí, y una alarma que siempre suena deja de avisar.
        </p>
      </section>

      {chequeos.map((c) => (
        <ChequeoCard key={c.id} c={c} />
      ))}
    </div>
  );
}
