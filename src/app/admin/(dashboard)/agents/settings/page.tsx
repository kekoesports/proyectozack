import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { Badge } from '@/features/admin/agents/components/AgentBadges';
import { formatCost, formatDateTime, formatRelative, isWorkerAlive } from '@/features/admin/agents/format';
import { areAgentsEnabled, getAgentRuntimeLimits } from '@/lib/agents/runtime-flags';
import { requirePermission } from '@/lib/permissions';
import { getBudgetOverview } from '@/lib/queries/agents/admin';
import { listWorkerHeartbeats } from '@/lib/queries/agents/workers';

export const metadata = { title: 'Ajustes | Agentes' };

/**
 * Presupuestos, kill switch y salud del worker.
 *
 * El kill switch global se muestra pero **no se puede cambiar desde aquí**:
 * `AGENTS_ENABLED` es una variable de entorno del despliegue. Fingir un
 * interruptor que en realidad no apaga nada sería peor que no tenerlo — el
 * interruptor accionable es el estado de cada agente, en el catálogo.
 */
export default async function AgentSettingsPage(): Promise<React.ReactElement> {
  await requirePermission('agents', 'read');
  const ahora = new Date();

  const [presupuesto, workers] = await Promise.all([getBudgetOverview(ahora), listWorkerHeartbeats()]);
  const limites = getAgentRuntimeLimits();
  const encendido = areAgentsEnabled();
  const vivos = workers.filter((w) => isWorkerAlive(w.lastHeartbeatAt, ahora)).length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Ajustes"
        subtitle="Presupuesto, interruptores y salud del execution plane"
        stats={[
          { label: 'gastado este mes', value: formatCost(presupuesto.globalSpentMicros, presupuesto.pricingUnknown) },
          { label: 'workers vivos', value: vivos, accent: vivos === 0 ? '#f59e0b' : '#10b981' },
        ]}
        actions={[{ label: 'Agentes', href: '/admin/agents' }]}
      />

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-sp-admin-muted">
          Interruptor global
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={encendido ? 'ok' : 'neutro'}>
            AGENTS_ENABLED = {encendido ? 'true' : 'false'}
          </Badge>
          <span className="text-[11px] text-sp-admin-muted">
            {encendido
              ? 'El runtime acepta encolar y ejecutar.'
              : 'Nada se encola ni se ejecuta, digan lo que digan los agentes.'}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-sp-admin-muted">
          Es una variable de entorno y se cambia en el despliegue, no desde aquí. El interruptor que
          sí se acciona en el panel es el estado de cada agente, y se consulta en cada vuelta del
          worker: apagar uno surte efecto en menos de un ciclo de sondeo.
        </p>
      </section>

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-sp-admin-muted">Presupuesto</h2>

        {presupuesto.pricingUnknown && (
          <p className="mt-2 rounded border border-amber-600/40 bg-amber-950/20 px-2 py-1.5 text-[11px] text-amber-300">
            Algún consumo del mes no tenía tarifa conocida. Los totales son un <strong>mínimo</strong>,
            no una cifra: por eso llevan «≥». Un coste inventado se sumaría como si fuera real.
          </p>
        )}

        <table className="mt-2 w-full text-left text-[11px]">
          <thead className="text-[10px] uppercase tracking-wide text-sp-admin-muted">
            <tr>
              <th className="py-1">Agente</th>
              <th className="py-1">Gastado</th>
              <th className="py-1">Límite</th>
              <th className="py-1">Uso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-admin-border">
            {presupuesto.perAgent.map((a) => {
              const pct = a.limitMicros > 0 ? Math.round((a.spentMicros / a.limitMicros) * 100) : null;
              return (
                <tr key={a.slug}>
                  <td className="py-1.5 font-semibold text-sp-admin-text">{a.slug}</td>
                  <td className="py-1.5 text-sp-admin-muted">
                    {formatCost(a.spentMicros, presupuesto.pricingUnknown)}
                  </td>
                  <td className="py-1.5 text-sp-admin-muted">
                    {a.limitMicros > 0 ? formatCost(a.limitMicros, false) : 'sin techo propio'}
                  </td>
                  <td className="py-1.5">
                    {pct === null ? (
                      <span className="text-sp-admin-muted">—</span>
                    ) : (
                      <span className={pct >= 80 ? 'font-semibold text-red-400' : 'text-sp-admin-muted'}>
                        {pct} %
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-sp-admin-border pt-2 text-[11px] md:grid-cols-4">
          <div>
            <dt className="text-sp-admin-muted">Techo global</dt>
            <dd className="font-semibold text-sp-admin-text">
              {formatCost(limites.globalMonthlyBudgetMicros, false)}
            </dd>
          </div>
          <div>
            <dt className="text-sp-admin-muted">Sondeo</dt>
            <dd className="font-semibold text-sp-admin-text">{limites.workerPollMs} ms</dd>
          </div>
          <div>
            <dt className="text-sp-admin-muted">Lease</dt>
            <dd className="font-semibold text-sp-admin-text">{limites.leaseSeconds} s</dd>
          </div>
          <div>
            <dt className="text-sp-admin-muted">Concurrencia</dt>
            <dd className="font-semibold text-sp-admin-text">{limites.maxConcurrency}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-panel p-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-sp-admin-muted">Workers</h2>

        {workers.length === 0 ? (
          <p className="mt-2 text-[11px] text-sp-admin-muted">
            Ningún worker se ha registrado nunca. Es lo esperado: no se ha desplegado.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {workers.map((w) => {
              const vivo = isWorkerAlive(w.lastHeartbeatAt, ahora);
              return (
                <li
                  key={w.workerId}
                  className="flex flex-wrap items-center gap-2 rounded border border-sp-admin-border px-2 py-1.5 text-[11px]"
                >
                  <Badge tone={vivo ? 'ok' : 'alarma'}>{vivo ? 'vivo' : 'sin latido'}</Badge>
                  <span className="font-mono text-sp-admin-text">{w.workerId}</span>
                  <span className="text-sp-admin-muted">{w.status}</span>
                  {w.currentRunId && <span className="text-sp-admin-muted">run #{w.currentRunId}</span>}
                  <span className="ml-auto text-sp-admin-muted" title={formatDateTime(w.lastHeartbeatAt)}>
                    {formatRelative(w.lastHeartbeatAt, ahora)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-2 text-[11px] text-sp-admin-muted">
          Un latido de hace más de dos minutos con estado «healthy» significa que el proceso murió sin
          apagarse ordenadamente. Los leases de sus ejecuciones vencerán y otro worker las recogerá.
        </p>
      </section>
    </div>
  );
}
