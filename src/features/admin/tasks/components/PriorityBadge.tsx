import type { CrmTaskPriority } from '@/types';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';

const TONE_MAP: Record<CrmTaskPriority, Tone> = {
  alta: 'danger',
  media: 'warning',
  baja: 'neutral',
};

const LABEL_MAP: Record<CrmTaskPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

/**
 * Badge visual con tono según prioridad de tarea (alta=danger, media=warning, baja=neutral).
 *
 * @kind server
 * @feature admin/tasks
 * @example
 * ```tsx
 * <PriorityBadge priority="alta" />
 * ```
 */
export function PriorityBadge({ priority }: { readonly priority: CrmTaskPriority }): React.ReactElement {
  return (
    <StateBadge tone={TONE_MAP[priority]}>
      {LABEL_MAP[priority]}
    </StateBadge>
  );
}
