'use client';

import { useState, useTransition } from 'react';
import {
  EXPENSE_GROUPS,
  EXPENSE_GROUP_LABELS,
  EXPENSE_SUBTYPES_CAMPAIGN,
  EXPENSE_SUBTYPES_OPERATIONAL,
  EXPENSE_SUBTYPE_LABELS,
  type ExpenseGroupValue,
  type ExpenseSubtypeValue,
} from '@/lib/schemas/invoice';
import { classifyExpensesAction } from '@/app/admin/(dashboard)/finanzas/finanzas-actions';

type Props = {
  readonly selectedIds: readonly number[];
  readonly onDone?: () => void;
};

const SUBTYPE_OPTIONS: Record<ExpenseGroupValue, readonly string[]> = {
  campaign_direct: EXPENSE_SUBTYPES_CAMPAIGN,
  operational: EXPENSE_SUBTYPES_OPERATIONAL,
};

export function BulkClassifyPanel({ selectedIds, onDone }: Props): React.ReactElement {
  const [group, setGroup] = useState<ExpenseGroupValue | ''>('');
  const [subtype, setSubtype] = useState('');
  const [preview, setPreview] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const count = selectedIds.length;
  const subtypeOptions = group ? SUBTYPE_OPTIONS[group as ExpenseGroupValue] ?? [] : [];

  function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setGroup(e.target.value as ExpenseGroupValue | '');
    setSubtype('');
    setPreview(null);
  }

  function handlePreview() {
    if (!group || count === 0) return;
    const fd = new FormData();
    fd.set('ids', selectedIds.join(','));
    fd.set('expenseGroup', group);
    if (subtype) fd.set('expenseSubtype', subtype);
    fd.set('preview', 'true');
    startTransition(async () => {
      const result = await classifyExpensesAction(fd);
      if (!result.ok) { setError(result.error); return; }
      setPreview({ count: result.data.count });
      setError(null);
    });
  }

  function handleApply() {
    if (!group || count === 0) return;
    const fd = new FormData();
    fd.set('ids', selectedIds.join(','));
    fd.set('expenseGroup', group);
    if (subtype) fd.set('expenseSubtype', subtype);
    fd.set('preview', 'false');
    startTransition(async () => {
      const result = await classifyExpensesAction(fd);
      if (!result.ok) { setError(result.error); return; }
      setPreview(null);
      setError(null);
      onDone?.();
    });
  }

  if (count === 0) {
    return (
      <div className="text-xs text-sp-admin-muted p-3 border border-sp-admin-border rounded-xl">
        Selecciona una o más filas para clasificar en bloque.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 border border-sp-admin-border rounded-xl bg-sp-admin-card">
      <span className="text-xs text-sp-admin-muted font-semibold">
        {count} seleccionado{count > 1 ? 's' : ''}
      </span>

      <select
        value={group}
        onChange={handleGroupChange}
        className="text-xs border border-sp-admin-border rounded px-2 py-1 bg-sp-admin-bg text-sp-admin-fg"
      >
        <option value="">— Grupo —</option>
        {EXPENSE_GROUPS.map((g) => (
          <option key={g} value={g}>{EXPENSE_GROUP_LABELS[g]}</option>
        ))}
      </select>

      {group && (
        <select
          value={subtype}
          onChange={(e) => setSubtype(e.target.value)}
          className="text-xs border border-sp-admin-border rounded px-2 py-1 bg-sp-admin-bg text-sp-admin-fg"
        >
          <option value="">— Subtipo (opcional) —</option>
          {subtypeOptions.map((s) => (
            <option key={s} value={s}>{EXPENSE_SUBTYPE_LABELS[s as ExpenseSubtypeValue] ?? s}</option>
          ))}
        </select>
      )}

      {group && !preview && (
        <button
          onClick={handlePreview}
          disabled={isPending}
          className="text-xs px-3 py-1 border border-sp-admin-border rounded hover:bg-sp-admin-hover disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Calculando…' : 'Vista previa'}
        </button>
      )}

      {preview && (
        <>
          <span className="text-xs text-amber-400">
            Se clasificarán {preview.count} facturas como <strong>{EXPENSE_GROUP_LABELS[group as ExpenseGroupValue]}</strong>.
          </span>
          <button
            onClick={handleApply}
            disabled={isPending}
            className="text-xs px-3 py-1 rounded bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors font-semibold"
          >
            {isPending ? 'Aplicando…' : 'Confirmar'}
          </button>
          <button
            onClick={() => setPreview(null)}
            className="text-xs text-sp-admin-muted hover:text-sp-admin-fg"
          >
            Cancelar
          </button>
        </>
      )}

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
