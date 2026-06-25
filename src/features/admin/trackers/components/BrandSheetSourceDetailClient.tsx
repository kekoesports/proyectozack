'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SheetDetectionPreview } from './SheetDetectionPreview';
import {
  detectSheetStructureAction,
  applySheetDetectionAction,
  syncTrackerBlockAction,
  syncSourceAction,
} from '@/app/admin/(dashboard)/entregables/source-actions';
import type { SheetSourceWithTrackers } from '@/lib/queries/brand-sheet-sources';
import type {
  SheetDetectionPreview as SheetDetectionPreviewType,
  BlockPreviewItem,
} from '@/app/admin/(dashboard)/entregables/source-actions';
import Link from 'next/link';

type Props = {
  source: SheetSourceWithTrackers;
};

const STATUS_LABELS: Record<string, string> = {
  active:  'Activa',
  paused:  'Pausada',
  error:   'Error',
};

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-800',
  paused:  'bg-yellow-100 text-yellow-800',
  error:   'bg-red-100 text-red-800',
};

export function BrandSheetSourceDetailClient({ source }: Props) {
  const router = useRouter();
  const [preview, setPreview]               = useState<SheetDetectionPreviewType | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<BlockPreviewItem[]>([]);
  const [statusMsg, setStatusMsg]           = useState<string | null>(null);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);

  const [isDetecting, startDetect]       = useTransition();
  const [isApplying, startApply]         = useTransition();
  const [isSyncing, startSync]           = useTransition();
  const [isSyncingAll, startSyncAll]     = useTransition();
  const [syncingTracker, setSyncingTracker] = useState<number | null>(null);

  function handleDetect() {
    const fd = new FormData();
    fd.append('sourceId', String(source.id));
    startDetect(async () => {
      setErrorMsg(null);
      setStatusMsg(null);
      const result = await detectSheetStructureAction(fd);
      if (!result.ok) {
        setErrorMsg(result.error);
      } else if (result.preview) {
        setPreview(result.preview);
        // Pre-select blocks with action !== no_change
        const actionable = result.preview.tabs
          .flatMap((t) => t.blocks)
          .filter((b) => b.action !== 'no_change');
        setSelectedBlocks(actionable);
      }
    });
  }

  function handleApply() {
    if (selectedBlocks.length === 0) {
      setErrorMsg('Selecciona al menos un bloque para aplicar');
      return;
    }
    const fd = new FormData();
    fd.append('sourceId', String(source.id));
    fd.append('selectedBlocks', JSON.stringify(selectedBlocks));
    startApply(async () => {
      setErrorMsg(null);
      const result = await applySheetDetectionAction(fd);
      if (!result.ok) {
        setErrorMsg(result.error);
      } else {
        setStatusMsg(
          `Aplicado: ${result.created ?? 0} trackers creados, ${result.updated ?? 0} actualizados.`,
        );
        setPreview(null);
        router.refresh();
      }
    });
  }

  function handleSyncTracker(trackerId: number) {
    const fd = new FormData();
    fd.append('trackerId', String(trackerId));
    setSyncingTracker(trackerId);
    startSync(async () => {
      setErrorMsg(null);
      const result = await syncTrackerBlockAction(fd);
      setSyncingTracker(null);
      if (!result.ok) {
        setErrorMsg(result.error);
      } else {
        setStatusMsg(`Tracker ${trackerId}: ${result.inserted ?? 0} nuevos links importados.`);
      }
    });
  }

  function handleSyncAll() {
    const fd = new FormData();
    fd.append('sourceId', String(source.id));
    startSyncAll(async () => {
      setErrorMsg(null);
      const result = await syncSourceAction(fd);
      if (!result.ok) {
        setErrorMsg(result.error);
      } else {
        setStatusMsg(`Sync completo: ${result.synced ?? 0} trackers sincronizados, ${result.newBlocks ?? 0} con nuevos links.`);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-sp-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-sp-dark">{source.brandName}</h1>
            {source.sourceTitle && (
              <p className="text-sm text-sp-muted mt-0.5">{source.sourceTitle}</p>
            )}
            <a
              href={source.googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sp-orange hover:underline mt-1 inline-block"
            >
              Abrir hoja ↗
            </a>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`text-xs font-semibold rounded-full px-2 py-0.5 ${STATUS_COLORS[source.status] ?? 'bg-sp-off text-sp-muted'}`}
            >
              {STATUS_LABELS[source.status] ?? source.status}
            </span>
            <button
              onClick={handleDetect}
              disabled={isDetecting}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
            >
              {isDetecting ? 'Detectando...' : 'Detectar estructura'}
            </button>
            {source.trackers.length > 0 && (
              <button
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-sp-border hover:bg-sp-off disabled:opacity-50 transition-colors text-sp-dark"
              >
                {isSyncingAll ? 'Sincronizando...' : 'Sincronizar todos'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-sp-muted">
          <span>{source.trackers.length} tracker{source.trackers.length !== 1 ? 's' : ''} vinculados</span>
          {source.lastScannedAt && (
            <span>Último escaneo: {new Date(source.lastScannedAt).toLocaleString('es-ES')}</span>
          )}
          {source.lastSyncedAt && (
            <span>Último sync: {new Date(source.lastSyncedAt).toLocaleString('es-ES')}</span>
          )}
        </div>

        {source.errorMessage && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs text-red-700">{source.errorMessage}</p>
          </div>
        )}
      </div>

      {/* Status messages */}
      {statusMsg && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-sm text-emerald-800">{statusMsg}</p>
          <button onClick={() => setStatusMsg(null)} className="text-emerald-600 text-lg leading-none">&times;</button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Detection preview */}
      {preview && (
        <div className="space-y-4">
          <SheetDetectionPreview preview={preview} onSelectionChange={setSelectedBlocks} />
          <div className="flex items-center gap-3">
            <button
              onClick={handleApply}
              disabled={isApplying || selectedBlocks.length === 0}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
            >
              {isApplying
                ? 'Aplicando...'
                : `Aplicar ${selectedBlocks.length} bloque${selectedBlocks.length !== 1 ? 's' : ''} seleccionados`}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-sp-border hover:bg-sp-off transition-colors text-sp-dark"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Trackers list */}
      {source.trackers.length > 0 && (
        <div className="bg-white rounded-2xl border border-sp-border p-6">
          <h2 className="text-sm font-bold text-sp-dark mb-4">
            Trackers vinculados — {source.trackers.length} total
          </h2>
          <div className="space-y-2">
            {source.trackers.map((tracker) => (
              <div
                key={tracker.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-sp-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/entregables/${tracker.id}`}
                    className="text-sm font-semibold text-sp-dark hover:text-sp-orange truncate block"
                  >
                    {tracker.dealName}
                  </Link>
                  {tracker.googleSheetBlockTitle && (
                    <p className="text-xs text-sp-muted truncate">{tracker.googleSheetBlockTitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-sp-muted">
                    {tracker.currentCount}/{tracker.targetCount}
                  </span>
                  <button
                    onClick={() => handleSyncTracker(tracker.id)}
                    disabled={isSyncing && syncingTracker === tracker.id}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-sp-border hover:bg-sp-off disabled:opacity-50 transition-colors text-sp-dark"
                  >
                    {isSyncing && syncingTracker === tracker.id ? 'Sincronizando...' : 'Sync'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
