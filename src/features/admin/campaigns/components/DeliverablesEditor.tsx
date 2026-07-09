'use client';

import { useMemo, useState, useTransition } from 'react';
import { DELIVERABLE_TYPES, DELIVERABLE_TYPE_LABELS, type DeliverableType } from '@/lib/schemas/deliverable';
import { TRACKING_TEMPLATE_URL } from '@/lib/constants/tracking-template';
import { syncCampaignSheetAction } from '@/app/admin/(dashboard)/campanas/actions';

/**
 * Bloque editable de entregables + seguimiento por Google Sheet.
 *
 * PR1 introdujo las filas de entregables (dealDeliverableTrackers).
 * PR2 añade:
 *   · Sección "Seguimiento": input Google Sheet URL + botón "Abrir plantilla
 *     de referencia" (link externo, no llama API) + botón "Sincronizar ahora"
 *     (llama syncCampaignSheetAction).
 *   · currentCount visible por fila en formato "Completados: X / Y" (solo
 *     lectura). Siempre visible, incluso "0 / N".
 *
 * NO llama a Google APIs desde el cliente. La única acción "seguimiento" es
 * el server action `syncCampaignSheetAction(campaignId)` que se ejecuta
 * server-side con `requirePermission('campanas', 'write')`.
 */

export type DeliverableEditorRow = {
  readonly id?: number;
  readonly deliverableType: DeliverableType;
  readonly targetCount: number;
  readonly currentCount?: number;
  readonly notes?: string;
};

type Props = {
  readonly initialRows: readonly DeliverableEditorRow[];
  /** Campaign en el que estamos editando. `null` si es "Nuevo trato" (no sincronizable aún). */
  readonly campaignId: number | null;
  /** Info del tracking sheet ya guardado (solo si `campaignId != null`). */
  readonly initialTracking?: {
    readonly url: string | null;
    readonly lastSyncedAt: string | null;
    readonly syncError: string | null;
  };
};

const TYPE_OPTIONS: readonly DeliverableType[] = [
  'stream_integration',
  'preroll',
  'video_youtube',
  'short_reel_tiktok',
  'story_instagram',
  'tweet_x',
  'post_instagram',
  'pack_mensual',
  'pack_trimestral',
  ...(DELIVERABLE_TYPES.filter((t) => t === 'otro') as DeliverableType[]),
];

const inputCls =
  'rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:ring-1 focus:ring-sp-admin-accent w-full';

const selectCls =
  'rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-admin-accent w-full';

const GOOGLE_SHEET_PLACEHOLDER = 'https://docs.google.com/spreadsheets/d/...';

function looksLikeGoogleSheetUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true; // vacío es válido (opcional)
  try {
    const u = new URL(trimmed);
    return u.hostname === 'docs.google.com' && u.pathname.startsWith('/spreadsheets/d/');
  } catch {
    return false;
  }
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function DeliverablesEditor({
  initialRows,
  campaignId,
  initialTracking,
}: Props): React.ReactElement {
  const [rows, setRows] = useState<DeliverableEditorRow[]>([...initialRows]);
  const [sheetUrl, setSheetUrl] = useState<string>(initialTracking?.url ?? '');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    initialTracking?.lastSyncedAt ?? null,
  );
  const [syncError, setSyncError] = useState<string | null>(
    initialTracking?.syncError ?? null,
  );
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const payload = useMemo(() => JSON.stringify(rows), [rows]);

  const sheetUrlValid = looksLikeGoogleSheetUrl(sheetUrl);
  const canSync =
    !!campaignId && !!sheetUrl.trim() && sheetUrlValid && !pending;

  function updateRow(idx: number, patch: Partial<DeliverableEditorRow>): void {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRow(idx: number): void {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function addRow(): void {
    setRows((prev) => [
      ...prev,
      { deliverableType: 'stream_integration', targetCount: 1 },
    ]);
  }

  function handleSync(): void {
    if (!campaignId) return;
    setSyncMessage(null);
    startTransition(async () => {
      const result = await syncCampaignSheetAction(campaignId);
      if (result.ok) {
        setLastSyncedAt(result.syncedAt);
        setSyncError(null);
        setSyncMessage('✅ ' + result.summary);
        // Refrescar currentCount visibles con lo que devolvió el sync
        // (recargar la página completa daría el estado más fresco; aquí solo
        // marcamos que hubo cambio para que el usuario vea el summary).
      } else {
        setSyncError(result.error);
        setSyncMessage(null);
      }
    });
  }

  const lastSyncedFmt = formatDateTime(lastSyncedAt);

  return (
    <div
      className="border-t border-sp-admin-border/50 pt-3"
      data-testid="deliverables-editor"
    >
      {/* ── Sección: Entregables ─────────────────────────────────────── */}
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
          Entregables del trato
        </p>
        {rows.length > 0 ? (
          <p className="text-[10px] text-sp-admin-muted">
            {rows.length} tipo{rows.length === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-sp-admin-muted mb-3">
          Sin entregables definidos. Añade filas para indicar cantidad por tipo
          (streams, prerolls, vídeos dedicados, shorts…).
        </p>
      ) : (
        <ul className="flex flex-col gap-2 mb-2">
          {rows.map((row, idx) => {
            const cc = row.currentCount ?? 0;
            const tgt = row.targetCount;
            const pct = tgt > 0 ? Math.min(100, Math.round((cc / tgt) * 100)) : 0;
            return (
              <li
                key={row.id ?? `new-${idx}`}
                className="flex flex-col gap-1"
                data-testid="deliverable-row"
              >
                <div className="grid grid-cols-[minmax(0,1.5fr)_80px_minmax(0,1.5fr)_auto] gap-2 items-center">
                  <select
                    aria-label="Tipo de entregable"
                    value={row.deliverableType}
                    onChange={(e) => updateRow(idx, { deliverableType: e.target.value as DeliverableType })}
                    className={selectCls}
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {DELIVERABLE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Cantidad"
                    type="number"
                    min={1}
                    step={1}
                    value={row.targetCount}
                    onChange={(e) => updateRow(idx, { targetCount: Math.max(1, Number(e.target.value) || 1) })}
                    className={inputCls}
                  />
                  <input
                    aria-label="Notas del entregable"
                    type="text"
                    value={row.notes ?? ''}
                    onChange={(e) => updateRow(idx, { notes: e.target.value })}
                    placeholder="Notas (opcional)"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="rounded-md border border-sp-admin-border px-2 py-1 text-xs text-sp-admin-muted hover:text-red-400 hover:border-red-500/50 transition-colors"
                    aria-label="Eliminar entregable"
                  >
                    Quitar
                  </button>
                </div>
                {row.id !== undefined ? (
                  <div className="flex items-center gap-2 ml-1" data-testid="deliverable-progress">
                    <span className="text-[10px] text-sp-admin-muted whitespace-nowrap">
                      Completados: <span className="text-sp-admin-text font-medium">{cc}</span> / {tgt}
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-sp-admin-border/40 overflow-hidden">
                      <div
                        className="h-full bg-sp-admin-accent transition-[width]"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-text hover:border-sp-admin-accent transition-colors"
        >
          + Añadir entregable
        </button>
      </div>

      {/* ── Sección: Seguimiento (PR2) ───────────────────────────────── */}
      <div
        className="mt-4 border-t border-sp-admin-border/50 pt-3"
        data-testid="tracking-sheet-section"
      >
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
            Seguimiento
          </p>
          {campaignId ? null : (
            <p className="text-[10px] text-sp-admin-muted italic">
              Guarda el trato para habilitar la sincronización.
            </p>
          )}
        </div>

        <label className="block text-xs text-sp-admin-muted mb-1">
          Link Google Sheet de seguimiento
        </label>
        <input
          type="url"
          name="trackingSheetUrl"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder={GOOGLE_SHEET_PLACEHOLDER}
          aria-label="Link Google Sheet de seguimiento"
          className={inputCls}
          data-testid="tracking-sheet-url-input"
        />
        {!sheetUrlValid ? (
          <p className="text-[10px] text-red-400 mt-1">
            URL no válida. Debe empezar por https://docs.google.com/spreadsheets/…
          </p>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap mt-2">
          <a
            href={TRACKING_TEMPLATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-text hover:border-sp-admin-accent transition-colors"
            data-testid="open-template-link"
          >
            Abrir plantilla de referencia ↗
          </a>

          <button
            type="button"
            onClick={handleSync}
            disabled={!canSync}
            aria-label="Sincronizar ahora con Google Sheet"
            title={
              !campaignId
                ? 'Guarda el trato antes de sincronizar'
                : !sheetUrl.trim()
                  ? 'Pega el link de la plantilla antes de sincronizar'
                  : 'Leer el Sheet público y actualizar el progreso de los entregables'
            }
            className={
              canSync
                ? 'rounded-md border border-sp-admin-accent bg-sp-admin-accent/10 px-3 py-1.5 text-xs text-sp-admin-text hover:bg-sp-admin-accent/20 transition-colors'
                : 'rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-muted opacity-60 cursor-not-allowed'
            }
            data-testid="sync-now-btn"
          >
            {pending ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        </div>

        <div className="mt-2 text-[10px] text-sp-admin-muted space-y-1">
          {lastSyncedFmt ? (
            <p>
              Última sincronización: <span className="text-sp-admin-text">{lastSyncedFmt}</span>
            </p>
          ) : (
            <p>Aún no se ha sincronizado.</p>
          )}
          {syncMessage ? (
            <p className="text-emerald-400" data-testid="sync-success-msg">
              {syncMessage}
            </p>
          ) : null}
          {syncError ? (
            <p className="text-red-400" data-testid="sync-error-msg">
              ⚠️ {syncError}
            </p>
          ) : null}
        </div>
      </div>

      <input type="hidden" name="deliverables_json" value={payload} />
    </div>
  );
}
