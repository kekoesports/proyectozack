'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ImportLinksModal } from './ImportLinksModal';
import { TrackerItemsTable } from './TrackerItemsTable';
import { TrackerProgressBar } from './TrackerProgressBar';
import { TrackerStatusBadge } from './TrackerStatusBadge';
import { SubtypeBreakdown } from './SubtypeBreakdown';
import {
  approveTrackerAction,
  updateTrackerTargetAction,
  updateTrackerParseModeAction,
  deleteTrackerAction,
  connectTrackerSheetAction,
  purgeTrackerDuplicatesAction,
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
  const [editParseMode, setEditParseMode] = useState(false);
  const [parseModeInput, setParseModeInput] = useState(tracker.trackingParseMode);
  const [isSavingParseMode, startSaveParseMode] = useTransition();
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [isConnecting, startConnect] = useTransition();
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);
  const [isPurging, startPurge] = useTransition();

  // Pre-compute subtype counts from items for SubtypeBreakdown
  const subtypeCounts = tracker.items.reduce<Record<string, number>>((acc, item) => {
    if (item.status !== 'valid' && item.status !== 'approved') return acc;
    const key = item.deliverableSubtype ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

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

  function handleSaveParseMode() {
    const fd = new FormData();
    fd.set('trackerId', String(tracker.id));
    fd.set('trackingParseMode', parseModeInput);
    startSaveParseMode(async () => {
      await updateTrackerParseModeAction(fd);
      setEditParseMode(false);
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

  function handleConnectSheet() {
    const fd = new FormData();
    fd.set('trackerId', String(tracker.id));
    fd.set('googleSheetUrl', sheetUrlInput.trim());
    fd.set('trackingParseMode', 'horizontal_triplets');
    startConnect(async () => {
      setConnectMsg(null);
      const result = await connectTrackerSheetAction(fd);
      if (!result.ok) {
        setConnectMsg(`Error: ${result.error}`);
      } else {
        setConnectMsg('Sheet conectado. Ahora puedes usar "Sincronizar ahora" para importar links.');
        router.refresh();
      }
    });
  }

  function handlePurgeDuplicates() {
    const dupeCount = tracker.items.filter((i) => i.status === 'duplicate').length;
    if (!window.confirm(`¿Eliminar ${dupeCount} items duplicados del tracker? Esta acción no se puede deshacer.`)) return;
    const fd = new FormData();
    fd.set('trackerId', String(tracker.id));
    startPurge(async () => {
      setPurgeMsg(null);
      const result = await purgeTrackerDuplicatesAction(fd);
      if (!result.ok) {
        setPurgeMsg(`Error: ${result.error}`);
      } else {
        setPurgeMsg(`${result.deleted ?? 0} duplicados eliminados.`);
        router.refresh();
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
        const enrichedPart = result.enriched && result.enriched > 0 ? ` · ${result.enriched} subtypes actualizados.` : '';
        setSyncMsg(`Sync completado: ${result.inserted ?? 0} nuevos links importados.${enrichedPart}`);
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
            {tracker.talentId && tracker.talentName && (
              <p className="text-xs text-sp-muted mt-0.5">
                Talento:{' '}
                <Link
                  href={`/admin/talents/${tracker.talentId}`}
                  className="text-sp-orange hover:underline font-medium"
                >
                  {tracker.talentName}
                </Link>
              </p>
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
            {tracker.googleSpreadsheetId != null && (tracker.status === 'active' || tracker.status === 'review_pending') && (
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

        {tracker.googleSpreadsheetId && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-sp-muted">Modo parseo:</span>
            {editParseMode ? (
              <>
                <select
                  value={parseModeInput}
                  onChange={(e) => setParseModeInput(e.target.value as typeof parseModeInput)}
                  className="border border-sp-border rounded px-2 py-0.5 text-xs bg-white"
                >
                  <option value="simple_columns">simple_columns</option>
                  <option value="socialpro_blocks">socialpro_blocks</option>
                  <option value="horizontal_triplets">horizontal_triplets</option>
                </select>
                <button
                  onClick={handleSaveParseMode}
                  disabled={isSavingParseMode}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold disabled:opacity-50"
                >
                  {isSavingParseMode ? '...' : 'Guardar'}
                </button>
                <button onClick={() => { setEditParseMode(false); setParseModeInput(tracker.trackingParseMode); }} className="text-sp-muted hover:text-sp-dark">
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <code className="bg-sp-off px-1.5 py-0.5 rounded text-sp-dark font-mono">{tracker.trackingParseMode}</code>
                <button onClick={() => setEditParseMode(true)} className="text-sp-muted hover:text-sp-orange">
                  editar
                </button>
              </>
            )}
          </div>
        )}

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

      {/* Conectar a Google Sheet (solo cuando no hay Sheet configurado) */}
      {!tracker.googleSpreadsheetId && (tracker.status === 'active' || tracker.status === 'review_pending') && (
        <div className="bg-white rounded-2xl border border-sp-border p-6">
          <h2 className="text-sm font-bold text-sp-dark mb-3">Conectar a Google Sheet</h2>
          <p className="text-xs text-sp-muted mb-3">
            Pega la URL de la pestaña del Sheet (con <code>#gid=…</code> si es necesario).
            El modo de parseo se fijará en <code>horizontal_triplets</code>.
            Los {tracker.items.length} links existentes no se eliminarán.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={sheetUrlInput}
              onChange={(e) => setSheetUrlInput(e.target.value)}
              className="flex-1 border border-sp-border rounded-lg px-3 py-1.5 text-sm text-sp-dark"
            />
            <button
              onClick={handleConnectSheet}
              disabled={isConnecting || !sheetUrlInput.trim()}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isConnecting ? 'Conectando…' : 'Conectar Sheet'}
            </button>
          </div>
          {connectMsg && (
            <p className={`text-xs mt-2 ${connectMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-700'}`}>
              {connectMsg}
            </p>
          )}
        </div>
      )}

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

      {/* Purgar duplicados (solo cuando existen) */}
      {tracker.items.some((i) => i.status === 'duplicate') && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {tracker.items.filter((i) => i.status === 'duplicate').length} items duplicados detectados
            </p>
            {purgeMsg && (
              <p className={`text-xs mt-1 ${purgeMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-700'}`}>
                {purgeMsg}
              </p>
            )}
          </div>
          <button
            onClick={handlePurgeDuplicates}
            disabled={isPurging}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-amber-400 text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isPurging ? 'Limpiando…' : 'Limpiar duplicados'}
          </button>
        </div>
      )}

      {/* Desglose por subtipo (solo horizontal_triplets) */}
      {tracker.trackingParseMode === 'horizontal_triplets' && tracker.items.length > 0 && (
        <SubtypeBreakdown currentCounts={subtypeCounts} dealName={tracker.dealName} />
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
