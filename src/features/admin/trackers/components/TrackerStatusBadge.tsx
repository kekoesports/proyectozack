type Props = { status: string };

const CONFIG: Record<string, { label: string; className: string }> = {
  active:         { label: 'Activo',          className: 'bg-blue-100 text-blue-700 border-blue-200' },
  review_pending: { label: 'Revisión',         className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved:       { label: 'Aprobado',         className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  paid:           { label: 'Pagado',           className: 'bg-purple-100 text-purple-700 border-purple-200' },
  cancelled:      { label: 'Cancelado',        className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function TrackerStatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
