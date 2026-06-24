'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrackerProgressBar } from './TrackerProgressBar';
import { TrackerStatusBadge } from './TrackerStatusBadge';
import { CreateTrackerForm } from './CreateTrackerForm';
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
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter]         = useState<string>('all');
  const router = useRouter();

  const filtered = filter === 'all'
    ? trackers
    : trackers.filter((t) => t.status === filter);

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
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors"
        >
          + Nuevo tracker
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'review_pending', 'approved', 'paid', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === s
                ? 'bg-sp-dark text-white border-sp-dark'
                : 'border-sp-border text-sp-muted hover:border-sp-dark hover:text-sp-dark'
            }`}
          >
            {s === 'all' ? 'Todos' : s === 'review_pending' ? 'Revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="ml-1 opacity-60">
                ({trackers.filter((t) => t.status === s).length})
              </span>
            )}
          </button>
        ))}
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
