'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import {
  approveDraftAction,
  rejectDraftAction,
} from '@/app/admin/(dashboard)/automation-drafts/actions';
import type { AutomationDealDraftListItem } from '@/lib/queries/automationDealDrafts';

import { isActionable, shortDateTime, sourceMeta, statusMeta, topLevelMissing } from './draftMeta';

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const sm = statusMeta(draft.status);
  const src = sourceMeta(draft.source);
  const missing = topLevelMissing(draft.missingFields);
  const actionable = isActionable(draft.status);

  const run = (action: typeof approveDraftAction | typeof rejectDraftAction): void => {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await action({ id: draft.id });
      if (!res.ok) setError(res.error);
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
          <strong>Faltan datos obligatorios:</strong> {missing.join(', ')}.
          <div className="text-xs mt-1 text-amber-200/80">
            El bot de Discord debe completarlos antes de que el trato pueda aprobarse. Este
            borrador no se pierde: queda aquí hasta que se resuelva o se rechace.
          </div>
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

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
        <h2 className="text-sm font-semibold text-sp-admin-text mb-3">Trato propuesto</h2>
        <pre className="text-xs text-sp-admin-text whitespace-pre-wrap break-words font-mono bg-sp-admin-bg2 rounded p-3 max-h-96 overflow-y-auto">
          {JSON.stringify(draft.proposedDeal, null, 2)}
        </pre>
      </section>
    </div>
  );
}
