'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  classifyUnlinkedTrackerAction,
  linkTrackerToCampaignAction,
} from '@/app/admin/(dashboard)/entregables/reconciliation-actions';
import type { ReconciliationQueueRow } from '@/lib/queries/tracker-reconciliation';
import type { TrackerReconciliationPreflight } from '@/lib/queries/tracker-reconciliation-preflight';
import type { TrackerReconciliationQueueFilter } from '@/lib/schemas/tracker-reconciliation';
import type { CampaignMatchInput } from '@/lib/tracker-reconciliation-match';

const FILTERS: { id: TrackerReconciliationQueueFilter; label: string }[] = [
  { id: 'unreconciled', label: 'Pendientes' },
  { id: 'deferred', label: 'Aplazados' },
  { id: 'legacy', label: 'Legacy' },
];

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

type Props = {
  readonly filter: TrackerReconciliationQueueFilter;
  readonly preflight: TrackerReconciliationPreflight;
  readonly rows: readonly ReconciliationQueueRow[];
  readonly campaigns: readonly CampaignMatchInput[];
};

export function TrackerReconciliationClient({ filter, preflight, rows, campaigns }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-sp-dark">Reconciliar trackers</h1>
        <p className="text-sm text-sp-muted">
          Enlace manual. Nunca se aplica un candidato automático, ni siquiera si solo hay uno.
        </p>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Sin campaña" value={preflight.trackersUnlinked} />
        <Stat label="Pendientes" value={preflight.trackersUnreconciled} />
        <Stat label="Piezas en huérfanos" value={preflight.activeValidOnUnlinked} />
        <Stat
          label="Dupes mismo tracker"
          value={preflight.sameTrackerUrlGroups}
          hint="Debe ser 0: unique (tracker, url)"
        />
        <Stat
          label="Misma URL, varios trackers"
          value={preflight.crossTrackerUrlGroups}
          hint={`${preflight.crossTrackerUrlExtraRows} filas extra`}
        />
      </dl>

      <nav className="flex gap-2" aria-label="Estado de reconciliación">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={
              item.id === 'unreconciled'
                ? '/admin/entregables/reconciliar'
                : `/admin/entregables/reconciliar?estado=${item.id}`
            }
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg border ${
              filter === item.id
                ? 'bg-sp-dark text-white border-sp-dark'
                : 'border-sp-border text-sp-muted hover:text-sp-dark'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-sm text-sp-muted border border-dashed border-sp-border rounded-lg px-4 py-8 text-center">
          No hay trackers en esta cola.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.trackerId}>
              <TrackerReconciliationCard row={row} campaigns={campaigns} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: number;
  readonly hint?: string;
}) {
  return (
    <div className="border border-sp-border rounded-lg px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-sp-muted">{label}</dt>
      <dd className="text-lg font-black text-sp-dark">{value}</dd>
      {hint ? <p className="text-[10px] text-sp-muted">{hint}</p> : null}
    </div>
  );
}

function TrackerReconciliationCard({
  row,
  campaigns,
}: {
  readonly row: ReconciliationQueueRow;
  readonly campaigns: readonly CampaignMatchInput[];
}) {
  const [campaignId, setCampaignId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sourceLabel =
    row.trackingSourceType === 'google_sheet' ? 'Google Sheet'
      : row.trackingSourceType === 'csv_upload' ? 'CSV'
        : row.trackingSourceType === 'xlsx_upload' ? 'Excel'
          : 'Manual';

  async function run(
    action: (form: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    extra: Record<string, string>,
  ): Promise<void> {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set('trackerId', String(row.trackerId));
    if (note.trim()) form.set('note', note.trim());
    for (const [key, value] of Object.entries(extra)) form.set(key, value);
    const result = await action(form);
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <article className="border border-sp-border rounded-xl p-4 space-y-3 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-sp-dark">
            #{row.trackerId} · {row.dealName}
          </h2>
          <p className="text-xs text-sp-muted">
            {row.brandName}
            {row.talentName ? ` · ${row.talentName}` : ' · sin talento'}
            {' · '}
            {row.currentCount}/{row.targetCount} · {row.itemCount} piezas · {sourceLabel}
          </p>
        </div>
        <Link
          href={`/admin/entregables/${row.trackerId}`}
          className="text-xs font-semibold text-sp-orange hover:underline"
        >
          Abrir tracker
        </Link>
      </header>

      {row.ambiguous ? (
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          Varios candidatos con la misma confianza. Elige uno; no se enlaza solo.
        </p>
      ) : null}

      {row.candidates.length === 0 ? (
        <p className="text-xs text-sp-muted">Sin sugerencias automáticas. Elige una campaña abajo.</p>
      ) : (
        <fieldset className="space-y-1" disabled={pending}>
          <legend className="text-[10px] font-bold uppercase tracking-wider text-sp-muted mb-1">
            Campañas candidatas
          </legend>
          {row.candidates.map((candidate) => (
            <label
              key={candidate.campaignId}
              className="flex items-start gap-2 text-sm text-sp-dark cursor-pointer"
            >
              <input
                type="radio"
                name={`campaign-${row.trackerId}`}
                value={candidate.campaignId}
                checked={campaignId === String(candidate.campaignId)}
                onChange={() => setCampaignId(String(candidate.campaignId))}
              />
              <span>
                <span className="font-semibold">{candidate.campaignName}</span>
                {' · '}
                {CONFIDENCE_LABEL[candidate.confidence] ?? candidate.confidence}
                {' · '}
                {candidate.reason}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <label className="block text-xs text-sp-muted">
        Campaña
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          disabled={pending}
          className="mt-1 w-full border border-sp-border rounded-lg px-2 py-1.5 text-sm text-sp-dark"
        >
          <option value="">Selecciona una campaña…</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name} · {campaign.brandName} × {campaign.talentName}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-sp-muted">
        Nota
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={2}
          className="mt-1 w-full border border-sp-border rounded-lg px-2 py-1.5 text-sm text-sp-dark"
        />
      </label>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !campaignId}
          onClick={() => { void run(linkTrackerToCampaignAction, { campaignId }); }}
          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-sp-orange text-white disabled:opacity-40"
        >
          Enlazar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => { void run(classifyUnlinkedTrackerAction, { status: 'deferred' }); }}
          className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-sp-border text-sp-dark"
        >
          Aplazar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => { void run(classifyUnlinkedTrackerAction, { status: 'legacy' }); }}
          className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-sp-border text-sp-muted"
        >
          Marcar legacy
        </button>
      </div>
    </article>
  );
}
