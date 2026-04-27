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

const VIEWS: ReadonlyArray<{ readonly key: ViewMode; readonly label: string; readonly icon: string }> = [
  { key: 'list', label: 'Lista', icon: '☰' },
  { key: 'kanban', label: 'Kanban', icon: '▦' },
  { key: 'calendar', label: 'Calendario', icon: '📅' },
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-full bg-sp-admin-card border border-sp-admin-border p-0.5">
          {VIEWS.map((v) => {
            const isActive = view === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  // Si veníamos de list con ?t=xx, limpiar ese param al cambiar de vista
                  if (activeIdParam && v.key !== 'list') router.replace(pathname, { scroll: false });
                  setView(v.key);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${isActive ? 'bg-sp-admin-accent text-sp-admin-bg' : 'text-sp-admin-muted hover:text-sp-admin-text'}`}
              >
                <span className="mr-1.5">{v.icon}</span>{v.label}
              </button>
            );
          })}
        </div>
      </div>

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

      {/* Modal específico para vistas Kanban/Calendario (Lista usa su propio router-driven modal) */}
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
