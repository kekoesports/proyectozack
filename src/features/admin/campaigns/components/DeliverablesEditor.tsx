'use client';

import { useMemo, useState } from 'react';
import { DELIVERABLE_TYPES, DELIVERABLE_TYPE_LABELS, type DeliverableType } from '@/lib/schemas/deliverable';

/**
 * Bloque editable de entregables ("Entregables" en el drawer de crear/editar trato).
 *
 * Cada fila representa una cantidad objetivo por tipo de entregable
 * (p. ej. "15 streams", "5 vídeos dedicados", "12 prerolls"). Se sincroniza
 * en un input hidden con name="deliverables_json" para que se envíe con el
 * FormData del drawer. El server action decodifica ese JSON y hace
 * INSERT/UPDATE/soft-delete en `dealDeliverableTrackers` con `campaignId`.
 *
 * Regla dura de PR1: NO llama a Google APIs, NO genera plantilla real. El
 * botón "Generar plantilla de seguimiento" está disabled con tooltip.
 */

export type DeliverableEditorRow = {
  readonly id?: number;
  readonly deliverableType: DeliverableType;
  readonly targetCount: number;
  readonly notes?: string;
};

type Props = {
  readonly initialRows: readonly DeliverableEditorRow[];
};

// Orden de los tipos en el select — Preroll y Stream primero por frecuencia
// en los deals que vemos.
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

export function DeliverablesEditor({ initialRows }: Props): React.ReactElement {
  const [rows, setRows] = useState<DeliverableEditorRow[]>([...initialRows]);

  const payload = useMemo(() => JSON.stringify(rows), [rows]);

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

  return (
    <div
      className="border-t border-sp-admin-border/50 pt-3"
      data-testid="deliverables-editor"
    >
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
          {rows.map((row, idx) => (
            <li
              key={row.id ?? `new-${idx}`}
              className="grid grid-cols-[minmax(0,1.5fr)_80px_minmax(0,1.5fr)_auto] gap-2 items-center"
            >
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
            </li>
          ))}
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

        <button
          type="button"
          disabled
          title="Próximamente: generación de plantilla en PR2"
          aria-label="Generar plantilla de seguimiento (próximamente)"
          className="rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-muted opacity-60 cursor-not-allowed"
          data-testid="generate-sheet-template-btn"
        >
          Generar plantilla de seguimiento
        </button>

        <span className="text-[10px] text-sp-admin-muted">
          El botón de plantilla se activa en PR2.
        </span>
      </div>

      {/* Hidden input serializado — lo consume la Server Action al enviar. */}
      <input type="hidden" name="deliverables_json" value={payload} />
    </div>
  );
}
