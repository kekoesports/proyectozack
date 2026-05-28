'use client';

import { useState, useTransition } from 'react';
import { updateTalentStatsAction, createTalentStatAction } from '@/app/admin/(dashboard)/talents/actions';

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

export function TalentStatsEditor({ talentId, stats }: Props): React.ReactElement {
  const [rows, setRows]        = useState<StatRow[]>(stats.map((s) => ({ ...s })));
  const [isPending, startTr]   = useTransition();
  const [saved, setSaved]      = useState(false);
  const [error, setError]      = useState('');

  const [showAdd, setShowAdd]   = useState(false);
  const [newIcon, setNewIcon]   = useState('📊');
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addPending, startAdd]  = useTransition();
  const [addError, setAddError] = useState('');

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

  function handleCreate(): void {
    setAddError('');
    startAdd(async () => {
      const res = await createTalentStatAction(talentId, {
        icon:      newIcon,
        label:     newLabel,
        value:     newValue,
        sortOrder: rows.length,
      });
      const newId = res.id;
      if (res.ok && newId !== undefined) {
        setRows((prev) => [...prev, { id: newId, icon: newIcon, label: newLabel, value: newValue }]);
        setNewIcon('📊');
        setNewLabel('');
        setNewValue('');
        setShowAdd(false);
      } else {
        setAddError(res.error ?? 'Error desconocido');
      }
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

      {showAdd && (
        <div className="rounded-lg border border-dashed border-sp-admin-accent/40 bg-sp-admin-bg/30 p-3 space-y-2">
          <p className={labelCls}>Nueva métrica</p>
          <div className="flex gap-2">
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="📊"
              maxLength={10}
              className="w-16 rounded-md border border-sp-admin-border bg-sp-admin-bg px-2 py-2 text-sm text-sp-admin-text focus:outline-none focus:border-sp-admin-accent/50 text-center"
            />
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej: Suscriptores YouTube"
              maxLength={100}
              className={`${inputCls} flex-1`}
            />
          </div>
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Ej: 120K"
            maxLength={50}
            className={inputCls}
          />
          {addError && <p className="text-[12px] text-red-500 font-medium">{addError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setAddError(''); }}
              className="h-8 px-4 rounded-lg border border-sp-admin-border text-sp-admin-muted text-[12px] font-semibold hover:bg-sp-admin-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={addPending || !newLabel.trim()}
              className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {addPending ? 'Creando…' : 'Crear métrica'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => { setShowAdd(true); setSaved(false); }}
          disabled={showAdd}
          className="text-[12px] text-sp-admin-accent font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity"
        >
          + Añadir métrica
        </button>
        <div className="flex-1" />
        {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
        {saved && <p className="text-[12px] text-emerald-600 font-semibold">✓ Guardado</p>}
        {rows.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? 'Guardando…' : 'Guardar métricas'}
          </button>
        )}
      </div>
    </div>
  );
}
