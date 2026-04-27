import type { CrmTaskStatus } from '@/types';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';

const TONE_MAP: Record<CrmTaskStatus, Tone> = {
  pendiente: 'warning',
  en_progreso: 'info',
  completada: 'success',
};

const LABEL_MAP: Record<CrmTaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
};

/**
 * Badge visual con tono según estado de tarea (pendiente=warning, en_progreso=info, completada=success).
 *
 * @kind server
 * @feature admin/tasks
 * @example
 * ```tsx
 * <TaskStatusBadge status="pendiente" />
 * ```
 */
export function TaskStatusBadge({ status }: { readonly status: CrmTaskStatus }): React.ReactElement {
  return (
    <StateBadge tone={TONE_MAP[status]}>
      {LABEL_MAP[status]}
    </StateBadge>
  );
}
