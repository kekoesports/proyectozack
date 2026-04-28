'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { CrmTask } from '@/types';
import { TaskList } from './TaskList';
import { TaskKanban } from './TaskKanban';
import { TaskCalendar } from './TaskCalendar';
import { TaskModal } from './TaskModal';
import type { RelatedLabel } from '@/lib/queries/crmTasks';
import type { RelatedOptions } from './RelatedSelector';

type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly users: readonly UserOption[];
  readonly currentUserId: string;
  readonly suggestedCategories: readonly string[];
  readonly weekLabel: string;
  readonly relatedOptions: RelatedOptions;
  readonly relatedLabels: ReadonlyMap<string, RelatedLabel>;
};

type ViewMode = 'list' | 'kanban' | 'calendar';

const VIEWS: ReadonlyArray<{ readonly key: ViewMode; readonly label: string; readonly icon: React.ReactNode }> = [
  {
    key: 'list',
    label: 'Lista',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="3" y1="3.5" x2="11" y2="3.5" />
        <line x1="3" y1="7" x2="11" y2="7" />
        <line x1="3" y1="10.5" x2="8" y2="10.5" />
      </svg>
    ),
  },
  {
    key: 'kanban',
    label: 'Kanban',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="1.5" y="2" width="3" height="10" rx="1" />
        <rect x="5.5" y="2" width="3" height="7" rx="1" />
        <rect x="9.5" y="2" width="3" height="8.5" rx="1" />
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: 'Calendario',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
        <line x1="1.5" y1="5.5" x2="12.5" y2="5.5" />
        <line x1="4.5" y1="1" x2="4.5" y2="4" />
        <line x1="9.5" y1="1" x2="9.5" y2="4" />
      </svg>
    ),
  },
];

// Estadísticas rápidas de las tareas
function TaskStats({ tasks, weekLabel }: { readonly tasks: readonly CrmTask[]; readonly weekLabel: string }): React.ReactElement {
  const pending = tasks.filter((t) => t.status === 'pendiente').length;
  const inProgress = tasks.filter((t) => t.status === 'en_progreso').length;
  const done = tasks.filter((t) => t.status === 'completada').length;
  const overdue = tasks.filter((t) => t.status !== 'completada' && t.dueDate !== null && new Date(t.dueDate) < new Date()).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {[
        { label: 'Pendientes',   value: pending,    color: '#72728a' },
        { label: 'En curso',     value: inProgress, color: '#f59e0b' },
        { label: 'Completadas',  value: done,       color: '#16a34a' },
        { label: 'Vencidas',     value: overdue,    color: overdue > 0 ? '#ef4444' : '#72728a' },
      ].map((s) => (
        <div key={s.label} className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[2px]" style={{ background: s.color }} />
          <div className="px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{s.label}</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskWorkspace(props: Props): React.ReactElement {
  const [view, setView] = useState<ViewMode>('list');
  const [modalTask, setModalTask] = useState<CrmTask | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openTask = (task: CrmTask): void => {
    if (view === 'list') {
      router.replace(`${pathname}?t=${task.id}`, { scroll: false });
    } else {
      setModalTask(task);
    }
  };

  const closeModal = (): void => setModalTask(null);
  const activeIdParam = searchParams.get('t');

  return (
    <div className="space-y-4">
      {/* Stats de la semana */}
      <TaskStats tasks={props.tasks} weekLabel={props.weekLabel} />

      {/* Toolbar: selector de vista */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-sp-admin-muted hidden sm:block">
          {props.tasks.length} {props.tasks.length === 1 ? 'tarea' : 'tareas'} · {props.weekLabel}
        </p>

        {/* View switcher */}
        <div className="flex items-center gap-0.5 bg-sp-admin-card border border-sp-admin-border rounded-lg p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {VIEWS.map((v) => {
            const isActive = view === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  if (activeIdParam && v.key !== 'list') router.replace(pathname, { scroll: false });
                  setView(v.key);
                }}
                title={v.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sp-admin-accent text-white shadow-sm'
                    : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
                }`}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vistas */}
      {view === 'list' && <TaskList {...props} />}

      {view === 'kanban' && (
        <TaskKanban
          tasks={props.tasks}
          users={props.users}
          relatedLabels={props.relatedLabels}
          onOpenAction={openTask}
        />
      )}

      {view === 'calendar' && (
        <TaskCalendar tasks={props.tasks} onOpenAction={openTask} />
      )}

      {modalTask && view !== 'list' && (
        <TaskModal
          key={modalTask.id}
          onCloseAction={closeModal}
          task={modalTask}
          users={props.users}
          suggestedCategories={props.suggestedCategories}
          defaultOwnerId={props.currentUserId}
          relatedOptions={props.relatedOptions}
        />
      )}
    </div>
  );
}
