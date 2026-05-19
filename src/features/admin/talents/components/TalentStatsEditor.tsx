'use client';

import { useState, useTransition } from 'react';
import { updateTalentStatsAction } from '@/app/admin/(dashboard)/talents/actions';

type StatRow = {
  readonly id:    number;
  readonly icon:  string;
  readonly label: string;
  value: string;
};

type Props = {
  readonly talentId: number;
  readonly stats:    readonly { id: number; icon: string; label: string; value: string }[];
};

const inputCls = 'w-full rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1';

/**
 * Editor inline de métricas públicas del talent (talent_stats).
 * Solo edita el campo `value`; label e icon son de solo lectura.
 *
 * @kind client
 * @feature admin/talents
 */
export function TalentStatsEditor({ talentId, stats }: Props): React.ReactElement {
  const [rows, setRows]        = useState<StatRow[]>(stats.map((s) => ({ ...s })));
  const [isPending, startTr]   = useTransition();
  const [saved, setSaved]      = useState(false);
  const [error, setError]      = useState('');

  function updateValue(idx: number, value: string): void {
    setSaved(false);
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, value } : r));
  }

  function handleSave(): void {
    setError('');
    setSaved(false);
    startTr(async () => {
      const res = await updateTalentStatsAction(
        talentId,
        rows.map((r) => ({ id: r.id, value: r.value })),
      );
      if (res.ok) setSaved(true);
      else setError(res.error ?? 'Error desconocido');
    });
  }

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={row.id} className="rounded-lg border border-sp-admin-border bg-sp-admin-bg/50 p-3">
          <label className={labelCls}>
            {row.icon} {row.label}
          </label>
          <input
            value={row.value}
            onChange={(e) => updateValue(idx, e.target.value)}
            placeholder="ej. 17.4K"
            maxLength={50}
            className={inputCls}
          />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1" />
        {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
        {saved && <p className="text-[12px] text-emerald-600 font-semibold">✓ Guardado</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Guardando…' : 'Guardar métricas'}
        </button>
      </div>
    </div>
  );
}
