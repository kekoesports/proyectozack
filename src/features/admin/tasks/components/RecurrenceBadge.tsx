import { CRM_TASK_RECURRENCE_LABELS } from '@/lib/schemas/taskTemplate';

import type { CrmTaskRecurrence } from '@/types';

/**
 * Badge que indica la frecuencia de recurrencia de una tarea (diaria, semanal, mensual…).
 *
 * @kind server
 * @feature admin/tasks
 * @example
 * ```tsx
 * <RecurrenceBadge frequency="weekly" />
 * ```
 */
export function RecurrenceBadge({ frequency }: { readonly frequency: CrmTaskRecurrence }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sp-admin-accent/30 bg-sp-admin-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sp-admin-accent">
      <span aria-hidden="true">↻</span>
      {CRM_TASK_RECURRENCE_LABELS[frequency]}
    </span>
  );
}
