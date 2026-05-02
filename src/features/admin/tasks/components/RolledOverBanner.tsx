import type { CrmTask } from '@/types';

type Props = {
  readonly count: number;
  readonly tasks?: readonly CrmTask[];
};

const PRIORITY_COLOR: Record<string, string> = {
  alta:  'text-red-600',
  media: 'text-amber-600',
  baja:  'text-sp-admin-muted',
};

/**
 * Banner con las tareas arrastradas (rolled-over) desde la semana anterior.
 * Si se pasan las tareas, muestra el listado con título y prioridad.
 */
export function RolledOverBanner({ count, tasks }: Props): React.ReactElement | null {
  if (count <= 0) return null;

  const label   = count === 1 ? '1 tarea arrastrada' : `${count} tareas arrastradas`;
  const rolled  = tasks?.filter((t) => t.rolledOver) ?? [];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-700 text-[12px] font-black shrink-0" aria-hidden>
          ↻
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-amber-800">{label} de la semana anterior</p>
          <p className="text-[11px] text-amber-600/90 mt-0.5">
            {count === 1
              ? 'Esta tarea no se completó la semana pasada. Complétala o quedará arrastrada de nuevo.'
              : 'Estas tareas no se completaron la semana pasada. Complétalas o se arrastrarán de nuevo al final de esta semana.'}
          </p>
        </div>
      </div>

      {/* Listado de tareas arrastradas */}
      {rolled.length > 0 && (
        <div className="border-t border-amber-200/60 divide-y divide-amber-200/40 bg-amber-50/60">
          {rolled.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2">
              <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${PRIORITY_COLOR[t.priority] ?? 'text-sp-admin-muted'}`}>
                {t.priority}
              </span>
              <p className="flex-1 text-[12px] font-medium text-amber-800 truncate">{t.title}</p>
              <span className="text-[9px] text-amber-600/70 shrink-0">
                {t.rolledFromWeek ?? 'semana anterior'}
              </span>
            </div>
          ))}
          {rolled.length > 5 && (
            <div className="px-4 py-2">
              <p className="text-[10px] text-amber-600/70">
                + {rolled.length - 5} más…
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
