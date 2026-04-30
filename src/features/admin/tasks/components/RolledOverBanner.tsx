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
    <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="text-amber-500 text-base leading-none" aria-hidden>↻</span>
      <span className="font-semibold">{label}</span>
      <span className="text-amber-600/80">de la semana pasada — completa o arrastra a la siguiente.</span>
    </div>
  );
}
