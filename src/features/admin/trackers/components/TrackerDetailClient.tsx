'use client';

import { useState, useTransition } from 'react';
import { ImportLinksModal } from './ImportLinksModal';
import { TrackerItemsTable } from './TrackerItemsTable';
import { TrackerProgressBar } from './TrackerProgressBar';
import { TrackerStatusBadge } from './TrackerStatusBadge';
import { approveTrackerAction } from '@/app/admin/(dashboard)/entregables/tracker-actions';
import type { TrackerWithItems } from '@/lib/queries/deal-trackers';

type Props = {
  tracker: TrackerWithItems;
};

export function TrackerDetailClient({ tracker }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [importMsg, setImportMsg]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleImported(result: { inserted: number; duplicates: number; invalid: number }) {
    setShowImport(false);
    setImportMsg(
      `Importación completada: ${result.inserted} nuevos, ${result.duplicates} duplicados, ${result.invalid} inválidos.`,
    );
  }

  function handleApprove() {
    const fd = new FormData();
    fd.append('trackerId', String(tracker.id));
    startTransition(async () => {
      await approveTrackerAction(fd);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-sp-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-sp-dark">{tracker.dealName}</h1>
            <p className="text-sm text-sp-muted mt-0.5">{tracker.brandName}</p>
            {tracker.talentName && (
              <p className="text-xs text-sp-muted mt-0.5">Talento: {tracker.talentName}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <TrackerStatusBadge status={tracker.status} />
            {(tracker.status === 'active' || tracker.status === 'review_pending') && (
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors"
              >
                Importar links
              </button>
            )}
            {tracker.status === 'review_pending' && (
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Aprobar deal
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <TrackerProgressBar
            current={tracker.currentCount}
            target={tracker.targetCount}
            status={tracker.status}
          />
        </div>

        {tracker.lastImportedAt && (
          <p className="text-xs text-sp-muted mt-3">
            Última importación: {new Date(tracker.lastImportedAt).toLocaleString('es-ES')}
            {tracker.sourceFileName && ` · ${tracker.sourceFileName}`}
          </p>
        )}
        {tracker.notes && (
          <p className="text-sm text-sp-muted mt-3 border-t border-sp-border pt-3">{tracker.notes}</p>
        )}
      </div>

      {/* Import result message */}
      {importMsg && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-sm text-emerald-800">{importMsg}</p>
          <button onClick={() => setImportMsg(null)} className="text-emerald-600 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-sp-border p-6">
        <h2 className="text-sm font-bold text-sp-dark mb-4">
          Links importados — {tracker.items.length} total
        </h2>
        <TrackerItemsTable trackerId={tracker.id} items={tracker.items} />
      </div>

      {/* Import modal */}
      {showImport && (
        <ImportLinksModal
          trackerId={tracker.id}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}
