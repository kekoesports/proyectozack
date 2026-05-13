'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RolledOverBanner } from './RolledOverBanner';
import type { CrmEvent, CrmTask, CrmTaskTemplate } from '@/types';
import type { RelatedLabel } from '@/lib/queries/crmTasks';
import { TaskTemplatesPanel } from './TaskTemplatesPanel';
import { TaskList } from './TaskList';
import { TaskKanban } from './TaskKanban';
import { TaskCalendar } from './TaskCalendar';
import { TaskModal } from './TaskModal';
type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly tasks: readonly CrmTask[];
  readonly calendarTasks?: readonly CrmTask[];
  readonly events?: readonly CrmEvent[] | undefined;
  readonly users: readonly UserOption[];
  readonly currentUserId: string;
  readonly suggestedCategories?: readonly string[];
  readonly weekLabel: string;
  readonly relatedOptions?: unknown;
  readonly relatedLabels?: ReadonlyMap<string, RelatedLabel> | undefined;
  readonly templates?: readonly CrmTaskTemplate[] | undefined;
};

type ViewMode = 'list' | 'kanban' | 'calendar';

const VIEWS: ReadonlyArray<{ readonly key: ViewMode; readonly label: string; readonly icon: React.ReactNode }> = [
  { key: 'list', label: 'Lista', icon: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <line x1="2" y1="3" x2="11" y2="3"/><line x1="2" y1="6.5" x2="11" y2="6.5"/><line x1="2" y1="10" x2="7" y2="10"/>
    </svg>
  )},
  { key: 'kanban', label: 'Kanban', icon: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <rect x="1" y="2" width="3" height="9" rx="1"/><rect x="5" y="2" width="3" height="6" rx="1"/><rect x="9" y="2" width="3" height="7.5" rx="1"/>
    </svg>
  )},
  { key: 'calendar', label: 'Calendario', icon: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <rect x="1" y="2" width="11" height="10" rx="1.5"/><line x1="1" y1="5" x2="12" y2="5"/><line x1="4" y1="1" x2="4" y2="3.5"/><line x1="9" y1="1" x2="9" y2="3.5"/>
    </svg>
  )},
];

/**
 * Orquestador del workspace de tareas: tabs entre lista / kanban / calendario y monta TaskModal.
 *
 * @kind client
 * @feature admin/tasks
 * @route /admin/tareas
 */
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

  const todayStr   = new Date().toISOString().slice(0, 10);
  const { pending, inProgress, done, overdue, dueToday, rolledTasks } = useMemo(() => {
    let p = 0, ip = 0, d = 0, ov = 0, dt = 0;
    const rolled: CrmTask[] = [];
    for (const t of props.tasks) {
      if (t.status === 'pendiente')   p++;
      if (t.status === 'en_progreso') ip++;
      if (t.status === 'completada')  d++;
      if (t.status !== 'completada' && t.dueDate !== null && t.dueDate < todayStr) ov++;
      if (t.status !== 'completada' && t.dueDate === todayStr) dt++;
      if (t.rolledOver && t.status !== 'completada') rolled.push(t);
    }
    return { pending: p, inProgress: ip, done: d, overdue: ov, dueToday: dt, rolledTasks: rolled };
  }, [props.tasks, todayStr]);
  const rolledOver = rolledTasks.length;

  return (
    <div className="space-y-4">
      {/* KPIs de la semana — 6 tarjetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Pendientes',  value: pending,    color: pending    > 0 ? '#f5632a' : '#72728a' },
          { label: 'En curso',    value: inProgress, color: inProgress > 0 ? '#f59e0b' : '#72728a' },
          { label: 'Completadas', value: done,       color: '#16a34a' },
          { label: 'Vencidas',    value: overdue,    color: overdue    > 0 ? '#ef4444' : '#72728a' },
          { label: 'Vencen hoy',  value: dueToday,   color: dueToday   > 0 ? '#f59e0b' : '#72728a' },
          { label: 'Arrastradas', value: rolledOver, color: rolledOver > 0 ? '#8b3aad' : '#72728a' },
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

      {/* Toolbar: semana + view switcher */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-sp-admin-muted hidden sm:block tabular-nums">
          {props.tasks.length} {props.tasks.length === 1 ? 'tarea' : 'tareas'} · {props.weekLabel}
        </p>

        <div className="flex items-center gap-0.5 bg-sp-admin-card border border-sp-admin-border rounded-lg p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {VIEWS.map((v) => {
            const isActive = view === v.key;
            return (
              <button
                key={v.key}
                type="button"
                title={v.label}
                onClick={() => {
                  if (activeIdParam && v.key !== 'list') router.replace(pathname, { scroll: false });
                  setView(v.key);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  isActive ? 'bg-sp-admin-accent text-white shadow-sm' : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
                }`}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner de tareas arrastradas — solo visibles si hay pendientes */}
      {rolledOver > 0 && (
        <RolledOverBanner tasks={rolledTasks} />
      )}

      {/* Panel de plantillas semanales */}
      <TaskTemplatesPanel tasks={props.tasks} weekLabel={props.weekLabel} templates={props.templates ?? []} />

      {/* Vistas */}
      {view === 'list' && (
        <TaskList
          tasks={props.tasks}
          users={props.users}
          currentUserId={props.currentUserId}
          suggestedCategories={props.suggestedCategories ?? []}
          weekLabel={props.weekLabel}
          relatedOptions={props.relatedOptions as never}
          {...(props.relatedLabels !== undefined ? { relatedLabels: props.relatedLabels } : {})}
        />
      )}

      {view === 'kanban' && (
        <TaskKanban
          tasks={props.tasks}
          users={props.users}
          {...(props.relatedLabels !== undefined ? { relatedLabels: props.relatedLabels } : {})}
          onOpenAction={openTask}
        />
      )}

      {view === 'calendar' && (
        <TaskCalendar
          tasks={props.calendarTasks ?? props.tasks}
          events={props.events ?? []}
          users={props.users}
          currentUserId={props.currentUserId}
          onOpenAction={openTask}
        />
      )}

      {/* Modal específico para vistas Kanban/Calendario (Lista usa su propio router-driven modal) */}
      {modalTask && view !== 'list' && (
        <TaskModal
          key={modalTask.id}
          onCloseAction={closeModal}
          task={modalTask}
          users={props.users}
          defaultOwnerId={props.currentUserId}
          {...(props.suggestedCategories !== undefined ? { suggestedCategories: props.suggestedCategories } : {})}
        />
      )}
    </div>
  );
}
