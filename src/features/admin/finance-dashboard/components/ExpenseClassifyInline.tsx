'use client';

import { useTransition } from 'react';
import {
  EXPENSE_GROUPS,
  EXPENSE_GROUP_LABELS,
  EXPENSE_SUBTYPES_CAMPAIGN,
  EXPENSE_SUBTYPES_OPERATIONAL,
  EXPENSE_SUBTYPE_LABELS,
  type ExpenseGroupValue,
  type ExpenseSubtypeValue,
} from '@/lib/schemas/invoice';
import { updateExpenseClassificationAction } from '@/app/admin/(dashboard)/finanzas/finanzas-actions';

type Props = {
  readonly invoiceId: number;
  readonly currentGroup: ExpenseGroupValue | null | undefined;
  readonly currentSubtype: ExpenseSubtypeValue | null | undefined;
};

const SUBTYPE_OPTIONS: Record<ExpenseGroupValue, readonly string[]> = {
  campaign_direct: EXPENSE_SUBTYPES_CAMPAIGN,
  operational: EXPENSE_SUBTYPES_OPERATIONAL,
};

export function ExpenseClassifyInline({ invoiceId, currentGroup, currentSubtype }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const group = e.target.value as ExpenseGroupValue;
    const fd = new FormData();
    fd.set('id', String(invoiceId));
    fd.set('expenseGroup', group);
    fd.set('expenseSubtype', '');
    startTransition(async () => { await updateExpenseClassificationAction(fd); });
  }

  function handleSubtypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!currentGroup) return;
    const fd = new FormData();
    fd.set('id', String(invoiceId));
    fd.set('expenseGroup', currentGroup);
    fd.set('expenseSubtype', e.target.value);
    startTransition(async () => { await updateExpenseClassificationAction(fd); });
  }

  const subtypeOptions = currentGroup ? SUBTYPE_OPTIONS[currentGroup] ?? [] : [];

  return (
    <div className={`flex gap-1.5 items-center ${isPending ? 'opacity-50' : ''}`}>
      <select
        value={currentGroup ?? ''}
        onChange={handleGroupChange}
        disabled={isPending}
        className="text-xs border border-sp-admin-border rounded px-1.5 py-0.5 bg-sp-admin-card text-sp-admin-fg"
      >
        <option value="">— grupo —</option>
        {EXPENSE_GROUPS.map((g) => (
          <option key={g} value={g}>{EXPENSE_GROUP_LABELS[g]}</option>
        ))}
      </select>

      {currentGroup && (
        <select
          value={currentSubtype ?? ''}
          onChange={handleSubtypeChange}
          disabled={isPending}
          className="text-xs border border-sp-admin-border rounded px-1.5 py-0.5 bg-sp-admin-card text-sp-admin-fg"
        >
          <option value="">— subtipo —</option>
          {subtypeOptions.map((s) => (
            <option key={s} value={s}>{EXPENSE_SUBTYPE_LABELS[s as ExpenseSubtypeValue] ?? s}</option>
          ))}
        </select>
      )}

      {!currentGroup && (
        <span className="text-[10px] bg-amber-500/15 text-amber-400 rounded px-1.5 py-0.5 font-medium">
          Sin clasificar
        </span>
      )}
    </div>
  );
}
