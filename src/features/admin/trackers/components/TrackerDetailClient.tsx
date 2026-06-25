'use client';

import { useState, useTransition } from 'react';
import { ImportLinksModal } from './ImportLinksModal';
import { TrackerItemsTable } from './TrackerItemsTable';
import { TrackerProgressBar } from './TrackerProgressBar';
import { TrackerStatusBadge } from './TrackerStatusBadge';
import {
  approveTrackerAction,
  updateTrackerTargetAction,
  deleteTrackerAction,
} from '@/app/admin/(dashboard)/entregables/tracker-actions';
import { syncTrackerBlockAction } from '@/app/admin/(dashboard)/entregables/source-actions';
import { useRouter } from 'next/navigation';
import type { TrackerWithItems } from '@/lib/queries/deal-trackers';

type Props = {
  tracker: TrackerWithItems;
};

export function TrackerDetailClient({ tracker }: Props) {
  const router = useRouter();
  const [showImport, setShowImport]     = useState(false);
  const [importMsg, setImportMsg]       = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();
  const [isSyncing, startSync]          = useTransition();
  const [syncMsg, setSyncMsg]           = useState<string | null>(null);
  const [editTarget, setEditTarget]     = useState(false);
  const [targetInput, setTargetInput]   = useState(String(tracker.targetCount));
  const [isSavingTarget, startSaveTarget] = useTransition();
  const [isDeleting, startDelete]       = useTransition();

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

  function handleSaveTarget() {
    const fd = new FormData();
    fd.set('trackerId', String(tracker.id));
    fd.set('targetCount', targetInput);
    startSaveTarget(async () => {
      await updateTrackerTargetAction(fd);
      setEditTarget(false);
    });
  }

  function handleDelete() {
    if (!window.confirm(`¿Eliminar el tracker "${tracker.dealName}"? Esta acción no se puede deshacer.`)) return;
    const fd = new FormData();
    fd.set('trackerId', String(tracker.id));
    startDelete(async () => {
      const result = await deleteTrackerAction(fd);
      if (result.ok) {
        router.push('/admin/entregables');
      }
    });
  }

  function handleSync() {
    const fd = new FormData();
    fd.append('trackerId', String(tracker.id));
    startSync(async () => {
      setSyncMsg(null);
      const result = await syncTrackerBlockAction(fd);
      if (!result.ok) {
        setSyncMsg(`Error al sincronizar: ${result.error}`);
      } else {
        setSyncMsg(`Sync completado: ${result.inserted ?? 0} nuevos links importados.`);
      }
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
          <div className="flex items-center gap-3 flex-wrap">
            <TrackerStatusBadge status={tracker.status} />
            {(tracker.status === 'active' || tracker.status === 'review_pending') && (
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors"
              >
                Importar links
              </button>
            )}
            {tracker.brandSheetSourceId != null && (tracker.status === 'active' || tracker.status === 'review_pending') && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-sp-border hover:bg-sp-off disabled:opacity-50 transition-colors text-sp-dark"
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
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
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-sp-muted">Objetivo</span>
            {editTarget ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-20 border border-sp-border rounded px-2 py-0.5 text-sm text-right"
                  autoFocus
                />
                <button
                  onClick={handleSaveTarget}
                  disabled={isSavingTarget}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  {isSavingTarget ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setEditTarget(false)} className="text-xs text-sp-muted hover:text-sp-dark">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditTarget(true)}
                className="text-xs text-sp-muted hover:text-sp-orange transition-colors"
              >
                {tracker.targetCount === 0 ? '+ Fijar objetivo' : `${tracker.currentCount}/${tracker.targetCount} · editar`}
              </button>
            )}
          </div>
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

      {/* Sync result message */}
      {syncMsg && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-800">{syncMsg}</p>
          <button onClick={() => setSyncMsg(null)} className="text-blue-600 text-lg leading-none">&times;</button>
        </div>
      )}

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
