import Link from 'next/link';
import type { EditorialCadenceWeek } from '@/lib/queries/editorialSlots';

function dateParam(date: Date, weekdayOffset: number): string {
  const scheduled = new Date(date);
  scheduled.setUTCDate(scheduled.getUTCDate() + weekdayOffset);
  scheduled.setUTCHours(9, 0, 0, 0);
  return scheduled.toISOString();
}

export function EditorialCadencePanel({ weeks }: { weeks: readonly EditorialCadenceWeek[] }): React.ReactElement {
  const missing = weeks.reduce((total, week) => total + Number(!week.news) + Number(!week.blog), 0);
  return (
    <section className="mb-6 rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-sp-admin-text">Ritmo editorial: 1 noticia + 1 blog por semana</h2>
          <p className="mt-1 text-xs text-sp-admin-muted">Las publicaciones futuras aparecen como programadas y se publican a su hora.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${missing === 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
          {missing === 0 ? '6 semanas cubiertas' : `${missing} huecos pendientes`}
        </span>
      </div>
      <div className="grid gap-2 lg:grid-cols-3">
        {weeks.map((week) => (
          <article key={week.startsAt.toISOString()} className="rounded-xl border border-sp-admin-border bg-sp-admin-bg/40 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">
              Semana del {week.startsAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
            </p>
            <Slot label="Noticia" post={week.news} createHref={`/admin/noticias/new?vertical=news&publishedAt=${encodeURIComponent(dateParam(week.startsAt, 2))}`} />
            <Slot label="Blog" post={week.blog} createHref={`/admin/noticias/new?vertical=blog&publishedAt=${encodeURIComponent(dateParam(week.startsAt, 4))}`} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Slot({
  label,
  post,
  createHref,
}: {
  label: string;
  post: EditorialCadenceWeek['news'];
  createHref: string;
}): React.ReactElement {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg bg-black/10 px-2.5 py-2 text-xs">
      <span className="min-w-0 truncate text-sp-admin-muted">
        <strong className={post ? 'text-emerald-300' : 'text-amber-300'}>{post ? '✓' : '—'} {label}</strong>
        {post ? ` · ${post.title}` : ' · sin contenido'}
      </span>
      {post ? (
        <Link href={`/admin/noticias/${post.id}/edit`} className="shrink-0 text-sp-admin-accent hover:underline">Editar</Link>
      ) : (
        <Link href={createHref} className="shrink-0 text-amber-300 hover:underline">Crear</Link>
      )}
    </div>
  );
}
