import type { InvoiceKind, InvoiceStatus } from '@/types';

type Props = {
  readonly status: InvoiceStatus;
  readonly kind: InvoiceKind;
};

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: (kind: InvoiceKind) => string; cls: string }
> = {
  cobrada:    { label: (k) => k === 'expense' ? 'Pagado'     : 'Cobrado',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  pagada:     { label: () => 'Pagada',      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  no_cobrado: { label: () => 'No cobrado',  cls: 'bg-red-50 text-red-700 border border-red-200' },
  no_pagado:  { label: () => 'No pagado',   cls: 'bg-red-50 text-red-700 border border-red-200' },
  no_cobrada: { label: () => 'No cobrada',  cls: 'bg-red-50 text-red-700 border border-red-200' },
  no_pagada:  { label: () => 'No pagada',   cls: 'bg-red-50 text-red-700 border border-red-200' },
  pendiente:  { label: () => 'Pendiente',   cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  parcial:    { label: () => 'Parcial',     cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  anulada:    { label: () => 'Anulado',     cls: 'bg-zinc-100 text-zinc-500 border border-zinc-200' },
  emitida:    { label: () => 'Emitida',     cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  vencida:    { label: () => 'Vencida',     cls: 'bg-red-50 text-red-700 border border-red-200' },
  borrador:   { label: () => 'Borrador',    cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

export function BillingStatusBadge({ status, kind }: Props): React.ReactElement {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${cfg.cls}`}>
      {cfg.label(kind)}
    </span>
  );
}

export function getStatusLabel(status: InvoiceStatus, kind: InvoiceKind): string {
  return STATUS_CONFIG[status]?.label(kind) ?? status;
}
