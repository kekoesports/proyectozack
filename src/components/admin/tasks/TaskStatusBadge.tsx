import type { CrmTaskStatus } from '@/types';

import { StateBadge } from '@/components/admin/ui/StateBadge';
import type { Tone } from '@/components/admin/ui/StateBadge';

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

export function TaskStatusBadge({ status }: { readonly status: CrmTaskStatus }): React.ReactElement {
  return (
    <StateBadge tone={TONE_MAP[status]}>
      {LABEL_MAP[status]}
    </StateBadge>
  );
}
