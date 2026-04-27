'use client';

import type { CrmTaskPriority, CrmTaskStatus, CrmTaskRelatedType } from '@/types';

export type UserOption = {
  readonly id: string;
  readonly name: string;
};

export const RELATED_TYPE_LABELS: Record<CrmTaskRelatedType, string> = {
  brand: 'Marca',
  talent: 'Talent',
  campaign: 'Campaña',
  invoice: 'Factura',
  general: 'General',
};

export const PRIORITIES: readonly CrmTaskPriority[] = ['alta', 'media', 'baja'];
export const STATUSES: readonly CrmTaskStatus[] = ['pendiente', 'en_progreso', 'completada'];

export const inputCls =
  'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:border-sp-admin-accent focus:outline-none';

export function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }): React.ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">{label}</span>
      {children}
    </label>
  );
}
