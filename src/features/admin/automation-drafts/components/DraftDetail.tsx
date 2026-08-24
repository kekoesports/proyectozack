'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  approveDraftAction,
  rejectDraftAction,
} from '@/app/admin/(dashboard)/automation-drafts/actions';
import type { AutomationDealDraftListItem } from '@/lib/queries/automationDealDrafts';

import { DraftDealEditor } from './DraftDealEditor';
import { isActionable, shortDateTime, sourceMeta, statusMeta } from './draftMeta';

type Props = {
  readonly draft: AutomationDealDraftListItem;
  readonly canWrite: boolean;
};

function Field({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <dt className="text-xs uppercase text-sp-admin-muted">{label}</dt>
      <dd className="text-sm text-sp-admin-text mt-0.5 break-words">{value}</dd>
    </div>
  );
}

export function DraftDetail({ draft, canWrite }: Props): React.ReactElement {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const sm = statusMeta(draft.status);
  const src = sourceMeta(draft.source);
  const missing = draft.validationIssues;
  const actionable = isActionable(draft.status);

  const run = (action: typeof approveDraftAction | typeof rejectDraftAction): void => {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await action({ id: draft.id });
      if (!res.ok) setError(res.error);
      else router.refresh();
      setBusy(false);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/automation-drafts"
            className="text-xs text-sp-admin-muted hover:text-sp-admin-text"
          >
            ← Borradores
          </Link>
          <h1 className="text-xl font-semibold text-sp-admin-text mt-1">
            {draft.dealName ?? `Borrador #${draft.id}`}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded border ${sm.color}`}>{sm.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded border ${src.color}`}>{src.label}</span>
          </div>
        </div>

        {canWrite && actionable ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || missing.length > 0}
              onClick={() => run(approveDraftAction)}
              title={
                missing.length > 0
                  ? 'Faltan datos obligatorios para poder aprobarlo'
                  : 'Crear el trato en el CRM'
              }
              className="px-3 py-1.5 text-sm rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Aprobar y crear trato
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(rejectDraftAction)}
              className="px-3 py-1.5 text-sm rounded border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text disabled:opacity-40"
            >
              Rechazar
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {missing.length > 0 ? (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <strong>Revisa estos datos antes de aprobar:</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {missing.map((issue) => (
              <li key={issue.path}><span className="font-medium">{issue.label}:</span> {issue.message}</li>
            ))}
          </ul>
          <div className="mt-2 text-xs text-amber-200/80">Puedes corregirlos directamente en la ficha inferior.</div>
        </div>
      ) : null}

      {draft.campaignId ? (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Trato creado:{' '}
          <Link href={`/admin/campanas/${draft.campaignId}`} className="underline">
            {draft.campaignName ?? `#${draft.campaignId}`}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
          <h2 className="text-sm font-semibold text-sp-admin-text mb-3">Procedencia</h2>
          <dl className="space-y-3">
            <Field label="Entrada" value={shortDateTime(draft.createdAt)} />
            <Field label="Última actualización" value={shortDateTime(draft.updatedAt)} />
            <Field label="ID externo" value={<code className="text-xs">{draft.externalId}</code>} />
            <Field label="Usuario de origen" value={draft.sourceUserId ?? '—'} />
            <Field label="Canal" value={draft.sourceChannelId ?? '—'} />
            <Field label="Revisado por" value={draft.reviewedBy ?? '—'} />
            <Field label="Revisado el" value={shortDateTime(draft.reviewedAt)} />
          </dl>
        </section>

        <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
          <h2 className="text-sm font-semibold text-sp-admin-text mb-3">Mensaje original</h2>
          <pre className="text-xs text-sp-admin-text whitespace-pre-wrap break-words font-mono bg-sp-admin-bg2 rounded p-3 max-h-64 overflow-y-auto">
            {draft.rawText}
          </pre>
        </section>
      </div>

      <DraftDealEditor
        draftId={draft.id}
        proposedDeal={draft.proposedDeal}
        serverIssues={draft.validationIssues}
        canWrite={canWrite && actionable}
      />
    </div>
  );
}
