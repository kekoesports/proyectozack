import Link from 'next/link';

import { IP_ACTIVITY_CATEGORIES } from '@/lib/ip-evidence/policy';
import { hasPermission, requirePermission } from '@/lib/permissions';
import {
  IP_EVIDENCE_KINDS,
  IP_LEGAL_ENTITIES,
  getIpReadinessDashboard,
} from '@/lib/queries/ipEvidence';

import { createIpProjectAction, createIpWorkLogAction, syncIpEvidenceAction } from './actions';

export const metadata = { title: 'Expediente IP — Zack Operaciones' };

const ENTITY_LABELS: Record<(typeof IP_LEGAL_ENTITIES)[number], string> = {
  elevatex_agency_pa_sl: 'ElevateX Agency PA SL',
  playmaker_media_llc: 'Playmaker Media LLC',
  founder_personal: 'Pablo / fundador (personal)',
};

function entityLabel(entity: (typeof IP_LEGAL_ENTITIES)[number] | null): string {
  return entity ? ENTITY_LABELS[entity] : 'Por determinar / revisión legal';
}

const CATEGORY_LABELS: Record<(typeof IP_ACTIVITY_CATEGORIES)[number], string> = {
  research: 'Investigación',
  experimental_development: 'Desarrollo experimental',
  product_development: 'Desarrollo de producto',
  testing: 'Pruebas técnicas',
  maintenance: 'Mantenimiento',
  operations: 'Operaciones',
  security: 'Seguridad',
  sales_marketing: 'Ventas / marketing',
  administration: 'Administración',
  training: 'Formación',
};

const EVIDENCE_LABELS: Record<(typeof IP_EVIDENCE_KINDS)[number], string> = {
  git_commit: 'Commit Git',
  github_pr: 'Pull request',
  task: 'Tarea',
  document: 'Documento',
  test_run: 'Ejecución de pruebas',
  deployment: 'Despliegue',
  other: 'Otra evidencia',
};

const ASSESSMENT_LABELS = {
  unassessed: 'Por revisar',
  rd_candidate: 'Candidata I+D',
  it_candidate: 'Candidata IT',
  non_qualifying: 'No candidata',
} as const;

const MESSAGE_BY_CODE: Record<string, { tone: 'success' | 'error'; text: string }> = {
  project: { tone: 'success', text: 'Proyecto de propiedad intelectual creado.' },
  log: { tone: 'success', text: 'Parte de trabajo registrado y sellado.' },
  'project-validation': { tone: 'error', text: 'Revisa los datos del proyecto.' },
  'project-code-exists': { tone: 'error', text: 'Ese código de proyecto ya existe.' },
  'project-create': { tone: 'error', text: 'No se pudo crear el proyecto.' },
  'log-validation': { tone: 'error', text: 'Revisa las horas y la evidencia del parte.' },
  'log-create': { tone: 'error', text: 'No se pudo registrar el parte.' },
  'evidence-sync': { tone: 'error', text: 'No se pudo completar la sincronización con GitHub.' },
};

function hours(minutes: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(minutes / 60);
}

function dateLabel(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

type PageProps = {
  readonly searchParams: Promise<{
    readonly created?: string;
    readonly error?: string;
    readonly count?: string;
  }>;
};

export default async function IpEvidencePage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const session = await requirePermission('ip_evidence', 'read');
  const [params, dashboard] = await Promise.all([searchParams, getIpReadinessDashboard()]);
  const canWrite = hasPermission(session.user.role, 'ip_evidence', 'write');
  const messageCode = params.error ?? params.created;
  const message = messageCode === 'evidence-sync' && params.created
    ? {
        tone: 'success' as const,
        text: `${Math.max(0, Number.parseInt(params.count ?? '0', 10) || 0)} evidencias nuevas registradas desde GitHub.`,
      }
    : messageCode ? MESSAGE_BY_CODE[messageCode] : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const writableProjects = dashboard.projects.filter((project) =>
    ['draft', 'active', 'paused'].includes(project.status),
  );

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-sp-muted">
            <Link href="/admin/asistente" className="hover:text-white">Zack Operaciones</Link>
            <span aria-hidden>›</span>
            <span className="text-sp-orange">Expediente IP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Expediente IP e I+D+i</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-sp-muted">
            Registra quién desarrolla cada activo, qué entidad soporta el coste y qué evidencia técnica existe. Prepara la trazabilidad para España y una futura estructura en Chipre sin atribuir hoy costes a una sociedad que aún no existe.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <form action={syncIpEvidenceAction}>
              <button
                type="submit"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:border-sp-orange/50 hover:text-sp-orange"
              >
                Sincronizar GitHub ahora
              </button>
            </form>
          )}
          <Link
            href="/admin/asistente"
            className="w-fit rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:border-sp-orange/50 hover:text-sp-orange"
          >
            Preguntar a Zack
          </Link>
        </div>
      </header>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
        <strong>Evidencia, no aprobación fiscal.</strong> Las etiquetas I+D e innovación tecnológica son provisionales. El asesor y, cuando corresponda, un informe técnico deberán confirmar su tratamiento.
      </div>

      {message && (
        <div
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.tone === 'success'
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
              : 'border-red-400/20 bg-red-400/10 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section aria-label="Resumen del expediente" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Proyectos activos', String(dashboard.summary.activeProjects), 'Expedientes en seguimiento'],
          ['Horas este mes', `${hours(dashboard.summary.monthMinutes)} h`, 'Trabajo total documentado'],
          ['Horas candidatas', `${hours(dashboard.summary.candidateMinutes)} h`, 'Clasificación provisional I+D/IT'],
          ['Registro contemporáneo', `${dashboard.summary.contemporaneousPercentage}%`, 'Partes del mismo día o siguiente'],
          ['Evidencias pendientes', String(dashboard.summary.pendingEvidence), 'PRs aún sin parte humano'],
        ].map(([label, value, detail]) => (
          <article key={label} className="rounded-xl border border-white/10 bg-sp-admin-card p-4">
            <p className="text-xs uppercase tracking-wider text-sp-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-sp-muted">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 2xl:grid-cols-2">
        {canWrite ? (
          <>
        <details className="rounded-xl border border-white/10 bg-sp-admin-card p-4" open={dashboard.projects.length === 0}>
          <summary className="cursor-pointer select-none font-semibold text-white">Crear proyecto IP</summary>
          <p className="mt-2 text-xs leading-5 text-sp-muted">
            Un proyecto separa el activo técnico, su titular actual y el pagador real. “Candidato Chipre” solo marca una posible revisión futura.
          </p>
          <form action={createIpProjectAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-sp-muted">
              Código
              <input name="code" required placeholder="KEKO-CORE" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-sp-muted">
              Inicio
              <input name="startedOn" type="date" max={today} defaultValue={today} required className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-sp-muted sm:col-span-2">
              Proyecto
              <input name="name" required placeholder="CRM y automatización SocialPro" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-sp-muted sm:col-span-2">
              Activo resultante
              <input name="assetName" required placeholder="Plataforma KekoPilot / código y modelos operativos" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-sp-muted">
              Titular actual
              <select name="ownerEntity" className="mt-1 w-full rounded-lg border border-white/10 bg-sp-admin-bg px-3 py-2 text-sm text-white">
                <option value="">Por determinar / revisión legal</option>
                {IP_LEGAL_ENTITIES.map((entity) => <option key={entity} value={entity}>{ENTITY_LABELS[entity]}</option>)}
              </select>
            </label>
            <label className="text-xs text-sp-muted">
              Entidad que paga el coste
              <select name="payingEntity" className="mt-1 w-full rounded-lg border border-white/10 bg-sp-admin-bg px-3 py-2 text-sm text-white">
                <option value="">Por determinar / conciliar</option>
                {IP_LEGAL_ENTITIES.map((entity) => <option key={entity} value={entity}>{ENTITY_LABELS[entity]}</option>)}
              </select>
            </label>
            <label className="text-xs text-sp-muted sm:col-span-2">
              Repositorio o referencia
              <input name="repositoryRef" placeholder="GitHub, carpeta técnica o expediente" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-sp-muted sm:col-span-2">
              Incertidumbre técnica
              <textarea name="technicalUncertainty" rows={3} placeholder="Qué problema técnico no se resolvía con una solución conocida o rutinaria" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-sp-muted sm:col-span-2">
              Resultado esperado
              <textarea name="expectedOutcome" rows={3} placeholder="Qué capacidad, mejora medible o conocimiento técnico debe producir" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-sp-muted sm:col-span-2">
              <input name="futureCyprusCandidate" type="checkbox" className="mt-1 accent-sp-orange" />
              Revisar este activo para una posible estructura chipriota futura. No cambia el titular ni el pagador actual.
            </label>
            <button type="submit" className="w-fit rounded-lg bg-sp-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 sm:col-span-2">
              Crear expediente
            </button>
          </form>
        </details>

        <details className="rounded-xl border border-white/10 bg-sp-admin-card p-4" open={writableProjects.length > 0}>
          <summary className="cursor-pointer select-none font-semibold text-white">Registrar trabajo y evidencia</summary>
          <p className="mt-2 text-xs leading-5 text-sp-muted">
            El parte es inmutable. Si se registra después del día siguiente queda identificado como reconstruido; no se borra ni se hace pasar por contemporáneo.
          </p>
          {writableProjects.length === 0 ? (
            <p className="mt-4 rounded-lg border border-white/10 p-3 text-sm text-sp-muted">No hay un proyecto abierto en el que registrar trabajo.</p>
          ) : (
            <form action={createIpWorkLogAction} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-sp-muted sm:col-span-2">
                Proyecto
                <select name="projectId" required className="mt-1 w-full rounded-lg border border-white/10 bg-sp-admin-bg px-3 py-2 text-sm text-white">
                  {writableProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.code} · {project.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-sp-muted">
                Persona que realizó el trabajo
                <input name="contributorName" required placeholder="Pablo Camacho" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
              </label>
              <label className="text-xs text-sp-muted">
                Fecha del trabajo
                <input name="workDate" type="date" max={today} defaultValue={today} required className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
              </label>
              <label className="text-xs text-sp-muted">
                Minutos
                <input name="minutes" type="number" min="1" max="1440" step="1" required placeholder="120" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
              </label>
              <label className="text-xs text-sp-muted">
                Tipo de actividad
                <select name="activityCategory" required className="mt-1 w-full rounded-lg border border-white/10 bg-sp-admin-bg px-3 py-2 text-sm text-white">
                  {IP_ACTIVITY_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
                </select>
              </label>
              <label className="text-xs text-sp-muted sm:col-span-2">
                Trabajo realizado
                <textarea name="description" minLength={10} rows={3} required placeholder="Problema abordado, decisión técnica y resultado comprobable" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
              </label>
              <label className="text-xs text-sp-muted sm:col-span-2">
                Evidencia automática (opcional)
                <select name="evidenceEventId" className="mt-1 w-full rounded-lg border border-white/10 bg-sp-admin-bg px-3 py-2 text-sm text-white">
                  <option value="">Añadir referencia manual</option>
                  {dashboard.pendingEvidence.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.projectCode} · {event.title}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block leading-5">Si eliges una, utiliza el mismo proyecto. El enlace y el tipo se copiarán sin alterar la evidencia original.</span>
              </label>
              <label className="text-xs text-sp-muted">
                Tipo de evidencia manual
                <select name="evidenceKind" defaultValue="" className="mt-1 w-full rounded-lg border border-white/10 bg-sp-admin-bg px-3 py-2 text-sm text-white">
                  <option value="">Se toma de la evidencia automática</option>
                  {IP_EVIDENCE_KINDS.map((kind) => <option key={kind} value={kind}>{EVIDENCE_LABELS[kind]}</option>)}
                </select>
              </label>
              <label className="text-xs text-sp-muted">
                Enlace o referencia manual
                <input name="evidenceRef" placeholder="PR, commit, documento o ejecución" className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
              </label>
              <button type="submit" className="w-fit rounded-lg bg-sp-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 sm:col-span-2">
                Sellar parte de trabajo
              </button>
            </form>
          )}
        </details>
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-sp-admin-card p-4 text-sm text-sp-muted 2xl:col-span-2">
            Tu acceso es de auditoría: puedes consultar proyectos, horas y huecos documentales, pero solo administración puede registrar o modificar proyectos.
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">Bandeja de evidencias automáticas</h2>
          <p className="text-xs text-sp-muted">
            PRs fusionados desde el inicio del seguimiento. No crean horas ni clasificación hasta que se vinculan a un parte real.
          </p>
        </div>
        {dashboard.pendingEvidence.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-sp-muted">
            No hay evidencias técnicas pendientes de asociar.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {dashboard.pendingEvidence.map((event) => (
              <article key={event.id} className="rounded-xl border border-white/10 bg-sp-admin-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-white/10 px-2 py-1 font-semibold text-white">{event.projectCode}</span>
                      <span className="rounded bg-cyan-400/10 px-2 py-1 text-cyan-200">{EVIDENCE_LABELS[event.evidenceKind]}</span>
                    </div>
                    <h3 className="mt-2 font-medium text-white">{event.title}</h3>
                    <p className="mt-1 text-xs text-sp-muted">
                      {dateLabel(event.occurredAt)}{event.actorName ? ` · ${event.actorName}` : ''}
                    </p>
                  </div>
                  <a
                    href={event.evidenceRef}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:border-sp-orange/50 hover:text-sp-orange"
                  >
                    Abrir evidencia
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">Preparación por activo</h2>
          <p className="text-xs text-sp-muted">El porcentaje mide calidad documental interna, no probabilidad de obtener el IP Box.</p>
        </div>
        {dashboard.projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-sp-muted">Todavía no hay proyectos en el expediente.</div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {dashboard.projects.map((project) => (
              <article key={project.id} className="rounded-xl border border-white/10 bg-sp-admin-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white">{project.code}</span>
                      {project.futureCyprusCandidate && <span className="rounded bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">Revisión Chipre futura</span>}
                    </div>
                    <h3 className="mt-2 font-semibold text-white">{project.name}</h3>
                    <p className="mt-0.5 text-xs text-sp-muted">Activo: {project.assetName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{project.readiness.score}%</p>
                    <p className="text-[11px] text-sp-muted">documentado</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-sp-orange" style={{ width: `${project.readiness.score}%` }} />
                </div>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div><dt className="text-sp-muted">Titular</dt><dd className="mt-1 text-white">{entityLabel(project.ownerEntity)}</dd></div>
                  <div><dt className="text-sp-muted">Pagador</dt><dd className="mt-1 text-white">{entityLabel(project.payingEntity)}</dd></div>
                  <div><dt className="text-sp-muted">Horas registradas</dt><dd className="mt-1 text-white">{hours(project.totalMinutes)} h</dd></div>
                  <div><dt className="text-sp-muted">Horas candidatas</dt><dd className="mt-1 text-white">{hours(project.candidateMinutes)} h</dd></div>
                </dl>
                {project.readiness.gaps.length > 0 && (
                  <div className="mt-4 rounded-lg bg-black/15 p-3">
                    <p className="text-xs font-semibold text-amber-200">Próximos huecos documentales</p>
                    <ul className="mt-2 space-y-1 text-xs text-sp-muted">
                      {project.readiness.gaps.slice(0, 3).map((gap) => <li key={gap}>• {gap}</li>)}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">Libro de evidencias</h2>
          <p className="text-xs text-sp-muted">Últimos 30 partes, conservados sin edición ni borrado.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-sp-admin-card">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-white/10 text-sp-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha / proyecto</th>
                <th className="px-4 py-3 font-medium">Trabajo</th>
                <th className="px-4 py-3 font-medium">Clasificación</th>
                <th className="px-4 py-3 font-medium">Evidencia</th>
                <th className="px-4 py-3 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dashboard.recentLogs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-4 py-3"><p className="text-white">{dateLabel(log.workDate)}</p><p className="mt-1 text-sp-muted">{log.projectCode} · {log.contributorName}</p></td>
                  <td className="max-w-md px-4 py-3"><p className="text-white">{log.description}</p><p className="mt-1 text-sp-muted">{hours(log.minutes)} h · {CATEGORY_LABELS[log.activityCategory]}</p></td>
                  <td className="px-4 py-3 text-white">{ASSESSMENT_LABELS[log.provisionalAssessment]}</td>
                  <td className="px-4 py-3"><p className="text-white">{EVIDENCE_LABELS[log.evidenceKind]}</p><p className="mt-1 max-w-xs break-all text-sp-muted">{log.evidenceRef}</p></td>
                  <td className="px-4 py-3"><span className={log.recordMode === 'contemporaneous' ? 'text-emerald-300' : 'text-amber-300'}>{log.recordMode === 'contemporaneous' ? 'Contemporáneo' : 'Reconstruido'}</span></td>
                </tr>
              ))}
              {dashboard.recentLogs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sp-muted">Aún no hay partes de trabajo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
