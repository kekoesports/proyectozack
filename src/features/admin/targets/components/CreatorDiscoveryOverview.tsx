import type { CreatorDiscoveryRun } from '@/lib/queries/creatorDiscoveryRuns';

export function CreatorDiscoveryOverview({
  runs,
}: {
  readonly runs: readonly CreatorDiscoveryRun[];
}): React.ReactElement {
  const latest = runs[0];
  const platformResults = latest?.platformResults ?? [];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Última búsqueda"
        value={latest ? formatDate(latest.startedAt) : 'Sin ejecuciones'}
        detail={latest ? statusLabel(latest.status) : 'Se activará al publicar'}
      />
      <MetricCard
        label="Perfiles revisados"
        value={String(latest?.foundCount ?? 0)}
        detail={`${latest?.qualifiedCount ?? 0} compatibles`}
      />
      <MetricCard
        label="Leads incorporados"
        value={String(latest?.insertedCount ?? 0)}
        detail={`${latest?.updatedCount ?? 0} actualizados sin duplicar`}
      />
      <MetricCard
        label="Plataformas automáticas"
        value={`${platformResults.filter((row) => row.error === null).length}/2`}
        detail={platformResults.find((row) => row.error)?.error ?? 'YouTube y Twitch operativas'}
      />
    </div>
  );
}

function MetricCard({ label, value, detail }: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}): React.ReactElement {
  return (
    <article className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-sp-admin-text">{value}</p>
      <p className="mt-1 line-clamp-2 text-[11px] text-sp-admin-muted">{detail}</p>
    </article>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(value);
}

function statusLabel(status: string): string {
  if (status === 'success') return 'Completada sin errores';
  if (status === 'partial') return 'Completada parcialmente';
  if (status === 'failed') return 'Requiere revisión';
  return 'En curso';
}
