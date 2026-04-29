import type { CrmTaskPriority } from '@/types';

const STYLES: Record<CrmTaskPriority, { dot: string; label: string; cls: string }> = {
  alta:  { dot: 'bg-red-500',   label: 'Alta',  cls: 'bg-red-50 text-red-700 border border-red-200' },
  media: { dot: 'bg-amber-400', label: 'Media', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  baja:  { dot: 'bg-slate-400', label: 'Baja',  cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

export function PriorityBadge({ priority }: { readonly priority: CrmTaskPriority }): React.ReactElement {
  const { dot, label, cls } = STYLES[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
