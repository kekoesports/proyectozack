'use client';

import { useState, useTransition } from 'react';
import {
  deleteTaskAction,
  resetRolledOverAction,
  resetRolledOverBulkAction,
} from '@/app/admin/(dashboard)/tareas/actions';
import type { CrmTask } from '@/types';

type Props = {
  readonly tasks: readonly CrmTask[];
};

const PRIORITY_COLOR: Record<string, string> = {
  alta:  'text-red-600',
  media: 'text-amber-600',
  baja:  'text-sp-admin-muted',
};

const COLLAPSED_LIMIT = 5;

function TaskRow({ task }: { readonly task: CrmTask }): React.ReactElement {
  const [pendingDismiss, startDismiss] = useTransition();
  const [pendingDelete, startDelete]   = useTransition();

  const handleDismiss = (): void => {
    startDismiss(async () => { await resetRolledOverAction(task.id); });
  };

  const handleDelete = (): void => {
    startDelete(async () => { await deleteTaskAction(task.id); });
  };

  const busy = pendingDismiss || pendingDelete;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${PRIORITY_COLOR[task.priority] ?? 'text-sp-admin-muted'}`}>
        {task.priority}
      </span>
      <p className="flex-1 text-[12px] font-medium text-amber-800 truncate">{task.title}</p>
      <span className="text-[9px] text-amber-600/70 shrink-0 hidden sm:block">
        {task.rolledFromWeek ?? 'semana anterior'}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={handleDismiss}
        className="shrink-0 text-[10px] font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-40 underline underline-offset-2 cursor-pointer"
      >
        {pendingDismiss ? '…' : 'Revisada'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={handleDelete}
        title="Eliminar tarea"
        className="shrink-0 text-amber-400 hover:text-red-600 disabled:opacity-40 cursor-pointer transition-colors"
      >
        {pendingDelete
          ? <span className="text-[10px]">…</span>
          : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <polyline points="2,3.5 11,3.5"/><path d="M4.5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1"/><path d="M5 5.5v4M8 5.5v4"/><rect x="3" y="3.5" width="7" height="7" rx="1"/>
            </svg>
          )
        }
      </button>
    </div>
  );
}

/**
 * Banner de tareas arrastradas desde semanas anteriores que aún están pendientes.
 * Recibe solo las tareas ya filtradas (rolledOver=true y status!=completada).
 */
export function RolledOverBanner({ tasks }: Props): React.ReactElement | null {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded]      = useState(false);

  if (tasks.length === 0) return null;

  const count     = tasks.length;
  const label     = count === 1 ? '1 tarea arrastrada' : `${count} tareas arrastradas`;
  const showAll   = expanded || count <= COLLAPSED_LIMIT;
  const visible   = showAll ? tasks : tasks.slice(0, COLLAPSED_LIMIT);
  const remaining = count - COLLAPSED_LIMIT;

  const handleDismissAll = (): void => {
    startTransition(async () => {
      await resetRolledOverBulkAction(tasks.map((t) => t.id));
    });
  };

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
        {count > 1 && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDismissAll}
            className="shrink-0 text-[11px] font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-40 whitespace-nowrap cursor-pointer"
          >
            {isPending ? 'Procesando…' : 'Marcar todas como revisadas'}
          </button>
        )}
      </div>

      {/* Listado */}
      <div className="border-t border-amber-200/60 divide-y divide-amber-200/40 bg-amber-50/60">
        {visible.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}

        {count > COLLAPSED_LIMIT && (
          <div className="px-4 py-2">
            <button
              type="button"
              onClick={() => { setExpanded((prev) => !prev); }}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 cursor-pointer"
            >
              {showAll ? 'Ocultar' : `Ver ${remaining} más`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
