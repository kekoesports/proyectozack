'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrackerProgressBar } from './TrackerProgressBar';
import { TrackerStatusBadge } from './TrackerStatusBadge';
import { CreateTrackerForm } from './CreateTrackerForm';
import { TrackersSummaryPanel } from './TrackersSummaryPanel';
import { useRouter } from 'next/navigation';
import type { TrackerSummary } from '@/lib/queries/deal-trackers';
import type { CrmBrand } from '@/types/crmBrand';

const DELIVERABLE_LABELS: Record<string, string> = {
  stream_integration:  'Stream',
  video_youtube:       'YouTube',
  short_reel_tiktok:  'Short/Reel',
  story_instagram:     'Story IG',
  tweet_x:             'Tweet/X',
  post_instagram:      'Post IG',
  otro:                'Otro',
};

type Talent = { id: number; name: string };

type Props = {
  trackers: TrackerSummary[];
  brands: Pick<CrmBrand, 'id' | 'name'>[];
  talents: Talent[];
};

export function TrackersListClient({ trackers, brands, talents }: Props) {
  const [showCreate, setShowCreate]     = useState(false);
  const [showSummary, setShowSummary]   = useState(false);
  // Default: solo activos + revisión pendiente (los archivados quedan ocultos)
  const [filter, setFilter]             = useState<string>('pending');
  const router = useRouter();

  const filtered =
    filter === 'all'     ? trackers :
    filter === 'pending' ? trackers.filter((t) => t.status === 'active' || t.status === 'review_pending') :
    trackers.filter((t) => t.status === filter);

  function handleCreated(newId: number) {
    setShowCreate(false);
    router.push(`/admin/entregables/${newId}`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-sp-dark">Entregables</h1>
          <p className="text-sm text-sp-muted">Tracking de links entregados por deal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSummary((v) => !v)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
              showSummary
                ? 'bg-sp-dark text-white border-sp-dark'
                : 'border-sp-border text-sp-muted hover:border-sp-dark hover:text-sp-dark'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors"
          >
            + Nuevo tracker
          </button>
        </div>
      </div>

      {/* Summary panel */}
      {showSummary && <TrackersSummaryPanel trackers={trackers} />}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {/* Tab pendientes — vista por defecto */}
        {([
          ['pending',       'Pendientes',  null],
          ['active',        'Activos',     'active'],
          ['review_pending','Revisión',    'review_pending'],
          ['approved',      'Aprobados',   'approved'],
          ['paid',          'Pagados',     'paid'],
          ['cancelled',     'Cancelados',  'cancelled'],
          ['all',           'Todos',       null],
        ] as [string, string, string | null][]).map(([key, label, statusKey]) => {
          const count = statusKey === null
            ? (key === 'pending'
                ? trackers.filter((t) => t.status === 'active' || t.status === 'review_pending').length
                : trackers.length)
            : trackers.filter((t) => t.status === statusKey).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === key
                  ? 'bg-sp-dark text-white border-sp-dark'
                  : 'border-sp-border text-sp-muted hover:border-sp-dark hover:text-sp-dark'
              }`}
            >
              {label}
              <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Create form (inline) */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-sp-border p-6">
          <h2 className="text-sm font-bold text-sp-dark mb-4">Nuevo tracker</h2>
          <CreateTrackerForm
            brands={brands}
            talents={talents}
            onSuccess={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sp-border p-10 text-center">
          <p className="text-sp-muted text-sm">No hay trackers{filter !== 'all' ? ` con estado "${filter}"` : ''}.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((tracker) => (
            <Link
              key={tracker.id}
              href={`/admin/entregables/${tracker.id}`}
              className="bg-white rounded-2xl border border-sp-border p-5 hover:border-sp-orange/50 transition-colors block"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <p className="font-bold text-sp-dark truncate">{tracker.dealName}</p>
                  <p className="text-xs text-sp-muted mt-0.5">
                    {tracker.brandName}
                    {tracker.talentName && ` · ${tracker.talentName}`}
                    {' · '}
                    <span className="text-sp-muted">{DELIVERABLE_LABELS[tracker.deliverableType] ?? tracker.deliverableType}</span>
                  </p>
                </div>
                <TrackerStatusBadge status={tracker.status} />
              </div>
              <TrackerProgressBar
                current={tracker.currentCount}
                target={tracker.targetCount}
                status={tracker.status}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
