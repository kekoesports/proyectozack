type Props = {
  readonly count: number;
};

/**
 * Banner que avisa al usuario de N tareas arrastradas (rolled-over) desde la semana anterior por el cron.
 * Se oculta automáticamente cuando count <= 0.
 *
 * @kind server
 * @feature admin/tasks
 * @example
 * ```tsx
 * <RolledOverBanner count={3} />
 * ```
 */
export function RolledOverBanner({ count }: Props): React.ReactElement | null {
  if (count <= 0) return null;
  const label = count === 1 ? '1 tarea arrastrada' : `${count} tareas arrastradas`;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <span aria-hidden>↻</span>
      <span>{label} de la semana pasada</span>
    </div>
  );
}
