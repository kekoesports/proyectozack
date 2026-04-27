import type { CrmTaskPriority } from '@/types';

import { StateBadge } from '@/components/admin/ui/StateBadge';
import type { Tone } from '@/components/admin/ui/StateBadge';

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

export function PriorityBadge({ priority }: { readonly priority: CrmTaskPriority }): React.ReactElement {
  return (
    <StateBadge tone={TONE_MAP[priority]}>
      {LABEL_MAP[priority]}
    </StateBadge>
  );
}
