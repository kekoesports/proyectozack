import type { CrmTaskStatus } from '@/types';

const STYLES: Record<CrmTaskStatus, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  en_progreso:{ label: 'En progreso',cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  completada: { label: 'Completada', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

export function TaskStatusBadge({ status }: { readonly status: CrmTaskStatus }): React.ReactElement {
  const { label, cls } = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
