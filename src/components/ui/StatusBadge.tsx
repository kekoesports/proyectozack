type Status = 'active' | 'available' | 'inactive';

const LABELS: Record<Status, string> = {
  active: 'Activo',
  available: 'Disponible',
  inactive: 'Inactivo',
};

type StatusBadgeProps = {
  status: Status;
  className?: string;
}

/**
 * Badge de estado (`active` / `available` / `inactive`) con color y label en
 * español derivados de la clase `badge-*` definida en `globals.css`.
 *
 * @kind server
 * @feature ui
 * @example
 * ```tsx
 * <StatusBadge status="active" />
 * ```
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`badge-${status} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
