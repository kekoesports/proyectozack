'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrackerProgressBar } from './TrackerProgressBar';
import { TrackerStatusBadge } from './TrackerStatusBadge';
import { CreateTrackerForm } from './CreateTrackerForm';
import { TrackersSummaryPanel } from './TrackersSummaryPanel';
import { useRouter } from 'next/navigation';
import type { TrackerSummary, TrackerSubtypeCounts } from '@/lib/queries/deal-trackers';
import type { CrmBrand } from '@/types/crmBrand';

const DELIVERABLE_LABELS: Record<string, string> = {
  stream_integration:  'Stream',
  video_youtube:       'YouTube',
  short_reel_tiktok:  'Short/Reel',
  story_instagram:     'Story IG',
  tweet_x:             'Tweet/X',
  post_instagram:      'Post IG',
  pack_mensual:        'Pack mensual',
  pack_trimestral:     'Pack trimestral',
  otro:                'Otro',
};

const SUBTYPE_LABELS: Record<string, string> = {
  dedicated_video: 'Videos',
  preroll:         'Prerolls',
  stream:          'Streams',
};

type Talent = { id: number; name: string };

type Props = {
  trackers: TrackerSummary[];
  brands: Pick<CrmBrand, 'id' | 'name'>[];
  talents: Talent[];
  subtypeCounts: TrackerSubtypeCounts;
  initialSearch: string;
};

export function TrackersListClient({ trackers, brands, talents, subtypeCounts, initialSearch }: Props) {
  const [showCreate, setShowCreate]     = useState(false);
  const [showSummary, setShowSummary]   = useState(false);
  const [filter, setFilter]             = useState<string>('pending');
  const [search, setSearch]             = useState(initialSearch);
  const router = useRouter();

  const filtered =
    filter === 'all'     ? trackers :
    filter === 'pending' ? trackers.filter((t) => t.status === 'active' || t.status === 'review_pending') :
    trackers.filter((t) => t.status === filter);

  function handleCreated(newId: number) {
    setShowCreate(false);
    router.push(`/admin/entregables/${newId}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/admin/entregables?q=${encodeURIComponent(q)}` : '/admin/entregables');
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

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por deal, marca, talento o URL…"
          className="flex-1 border border-sp-border rounded-lg px-3 py-1.5 text-sm text-sp-dark placeholder:text-sp-muted focus:outline-none focus:border-sp-orange"
        />
        <button
          type="submit"
          className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-sp-dark text-white hover:bg-sp-dark/80 transition-colors"
        >
          Buscar
        </button>
        {initialSearch && (
          <button
            type="button"
            onClick={() => { setSearch(''); router.push('/admin/entregables'); }}
            className="px-3 py-1.5 text-sm rounded-lg border border-sp-border text-sp-muted hover:text-sp-dark transition-colors"
          >
            ✕
          </button>
        )}
      </form>

      {/* Summary panel */}
      {showSummary && <TrackersSummaryPanel trackers={trackers} />}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
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
          <p className="text-sp-muted text-sm">
            {initialSearch
              ? `Sin resultados para "${initialSearch}"${filter !== 'all' ? ` con estado "${filter}"` : ''}.`
              : `No hay trackers${filter !== 'all' ? ` con estado "${filter}"` : ''}.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((tracker) => {
            const sc = subtypeCounts[tracker.id];
            const hasSubtypes = sc && (sc.dedicated_video > 0 || sc.preroll > 0 || sc.stream > 0);
            const syncDate = tracker.lastSyncedAt ?? tracker.lastImportedAt;

            return (
              <div
                key={tracker.id}
                className="relative bg-white rounded-2xl border border-sp-border p-5 hover:border-sp-orange/50 transition-colors"
              >
                {/* Stretched link — covers the whole card */}
                <Link
                  href={`/admin/entregables/${tracker.id}`}
                  className="absolute inset-0 rounded-2xl"
                  aria-label={`Ver tracker ${tracker.dealName}`}
                />

                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sp-dark truncate">{tracker.dealName}</p>
                    <p className="text-xs text-sp-muted mt-0.5">
                      {tracker.brandName}
                      {tracker.talentId && tracker.talentName && (
                        <>
                          {' · '}
                          <Link
                            href={`/admin/talents/${tracker.talentId}`}
                            className="relative z-10 text-sp-orange hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tracker.talentName}
                          </Link>
                        </>
                      )}
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

                {/* Per-subtype breakdown (solo si hay datos) */}
                {hasSubtypes && sc && (
                  <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-sp-border">
                    {(['dedicated_video', 'preroll', 'stream'] as const).map((s) => {
                      const n = sc[s];
                      if (!n) return null;
                      return (
                        <span key={s} className="text-xs text-sp-muted">
                          <span className="font-bold text-sp-dark">{n}</span> {SUBTYPE_LABELS[s]}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Última sync/import */}
                {syncDate && (
                  <p className="text-[10px] text-sp-muted mt-1.5">
                    Última actualización: {new Date(syncDate).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
