import Link from 'next/link';

import type { CreatorApplicationReview } from '@/lib/queries/creatorApplicationReviews';
import type { CreatorOutreachView } from '@/lib/queries/creatorOutreach';

import { CreatorApplicationActions } from './CreatorApplicationActions';

const DECISION_META = {
  green: { label: '🟢 Viable', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  yellow: { label: '🟡 Revisión humana', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  red: { label: '🔴 No encaja', color: 'border-red-500/40 bg-red-500/10 text-red-300' },
} as const;

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function Field({ label, value, link = false }: { readonly label: string; readonly value: string | null; readonly link?: boolean }): React.ReactElement | null {
  if (!value) return null;
  const href = link ? safeUrl(value) : null;
  return (
    <div>
      <dt className="text-xs uppercase text-sp-admin-muted">{label}</dt>
      <dd className="break-words text-sm text-sp-admin-text">{href ? <a href={href} target="_blank" rel="noreferrer" className="text-sp-admin-accent hover:underline">{value}</a> : value}</dd>
    </div>
  );
}

function Notes({ value }: { readonly value: string | null }): React.ReactElement {
  const lines = value?.split('\n').filter(Boolean).reverse() ?? [];
  return lines.length > 0 ? (
    <ol className="space-y-2">
      {lines.map((line, index) => <li key={`${line}-${index}`} className="border-l-2 border-sp-admin-border pl-3 text-sm text-sp-admin-text whitespace-pre-wrap">{line}</li>)}
    </ol>
  ) : <p className="text-sm text-sp-admin-muted">Sin notas internas.</p>;
}

export function CreatorApplicationDetail({
  item,
  outreach,
  canWrite,
}: {
  readonly item: CreatorApplicationReview;
  readonly outreach: CreatorOutreachView | null;
  readonly canWrite: boolean;
}): React.ReactElement {
  const decision = item.reviewDecision ? DECISION_META[item.reviewDecision] : null;
  return (
    <div className="space-y-5">
      <Link href="/admin/candidaturas" className="text-xs text-sp-admin-muted hover:text-sp-admin-text hover:underline">← Candidaturas</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-sp-admin-text">{item.name}</h1>
        {decision ? <span className={`rounded border px-2 py-1 text-xs ${decision.color}`}>{decision.label}</span> : <span className="rounded border border-sp-admin-border px-2 py-1 text-xs text-sp-admin-muted">Sin revisar</span>}
        <span className="text-xs text-sp-admin-muted">{item.outreachStatus}</span>
      </div>

      {item.qualificationReason ? (
        <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
          <h2 className="text-sm font-semibold text-sp-admin-text">Motivo del semáforo</h2>
          <p className="mt-2 text-sm text-sp-admin-text">{item.qualificationReason}</p>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-sp-admin-text">Perfil</h2>
          <dl className="space-y-2">
            <Field label="Email" value={item.email} />
            <Field label="País" value={item.country} />
            <Field label="Plataforma" value={item.platform} />
            <Field label="Canal principal" value={item.handle} link />
            <Field label="Otras redes" value={item.otherLinks} />
            <Field label="Recibida" value={item.createdAt.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} />
          </dl>
        </section>
        <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-sp-admin-text">Contenido y métricas declaradas</h2>
          <dl className="space-y-2">
            <Field label="Juego / contenido" value={item.contentCategory} />
            <Field label="Seguidores" value={item.followers} />
            <Field label="Audiencia media" value={item.averageAudience} />
            <Field label="Mensaje" value={item.message} />
          </dl>
        </section>
      </div>

      {canWrite ? <CreatorApplicationActions sourceType={item.sourceType} sourceId={item.sourceId} /> : null}

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-sp-admin-text">Historial de emails</h2>
        {outreach && outreach.messages.length > 0 ? (
          <ol className="space-y-2">
            {outreach.messages.map((message) => (
              <li key={message.id} className="rounded border border-sp-admin-border/70 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-sp-admin-muted">{message.direction === 'inbound' ? 'Recibido' : 'Enviado'} · {message.status} · {message.occurredAt.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
                <p className="mt-1 font-semibold text-sp-admin-text">{message.subject}</p>
                <p className="mt-1 whitespace-pre-wrap text-sp-admin-text">{message.textBody}</p>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-sp-admin-muted">Todavía no se ha enviado ni recibido ningún email.</p>}
      </section>

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-sp-admin-text">Notas internas</h2>
        <Notes value={item.internalNotes} />
      </section>
    </div>
  );
}
