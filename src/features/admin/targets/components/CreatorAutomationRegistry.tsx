import type { listAutomationRegistry } from '@/lib/queries/creatorSearchProfiles';

type Entry = Awaited<ReturnType<typeof listAutomationRegistry>>[number];

/** Persisted evidence only: absence of a run, measurement or timestamp is never healthy/zero. */
export function CreatorAutomationRegistry({ entries }: { readonly entries: readonly Entry[] }): React.ReactElement {
  return (
    <details className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
      <summary className="cursor-pointer text-sm font-bold text-sp-admin-text">Registro de automatizaciones ({entries.length})</summary>
      <div className="mt-4 space-y-3">
        <p className="text-xs text-sp-admin-muted">Última evidencia guardada; no es una comprobación en directo. Una búsqueda sin datos o sin medir consumo no se presenta como saludable ni gratuita.</p>
        {entries.length === 0 && <p className="text-xs text-sp-admin-muted">Sin automatizaciones registradas. Estado no verificado.</p>}
        {entries.map((entry) => (
          <article key={entry.key} className="rounded-lg border border-sp-admin-border p-3 text-xs text-sp-admin-muted">
            <h3 className="font-semibold text-sp-admin-text">{entry.name}</h3>
            <p className="mt-1">{entry.enabled ? 'Habilitada' : 'Pausada'} · Estado registrado: {entry.status} · Observado: {date(entry.observedAt)}</p>
            <p className="mt-1">Último éxito: {date(entry.lastSuccessAt)} · Último error: {date(entry.lastErrorAt)} · Próxima: {date(entry.nextRunAt)}</p>
            <p className="mt-1">Procesados: {measure(entry.itemsProcessed)} · Duración: {measure(entry.durationMs, ' ms')} · Peticiones: {measure(entry.usage?.requests)} · Coste: {measure(entry.usage?.costEur, ' €')}</p>
            {entry.lastError && <p className="mt-1 text-amber-300">Incidencia registrada. Revisa el detalle de la ejecución.</p>}
          </article>
        ))}
      </div>
    </details>
  );
}

function measure(value: number | null | undefined, suffix = ''): string {
  return value == null || !Number.isFinite(value) ? 'Sin medición' : `${value.toLocaleString('es-ES')}${suffix}`;
}
function date(value: Date | null): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Sin dato';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(value));
}
