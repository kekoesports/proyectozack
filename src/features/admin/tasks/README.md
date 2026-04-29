# Feature · admin/tasks

> Tareas con 18 plantillas recurrentes (`crm_task_templates`), rollover
> semanal vía cron `/api/cron/rollover-tasks`. Visibilidad: admin/manager
> ven todo; staff solo asignadas/creadas/owner.

## Routes

- `/admin/tareas` — workspace (kanban + lista + calendario).
- `/admin/tareas/plantillas` — gestión de plantillas recurrentes.

## Componentes

- `TaskWorkspace.tsx` — orquestador (kanban / lista / calendario).
- `TaskList.tsx` — vista lista.
- `TaskKanban.tsx` — vista kanban.
- `TaskCalendar.tsx` — vista calendario.
- `TaskModal.tsx` — modal de creación/edición.
- `TaskTemplatesManager.tsx` — gestión de plantillas.
- `TaskStatusBadge.tsx`, `PriorityBadge.tsx`, `RecurrenceBadge.tsx` — badges.
- `RolledOverBanner.tsx` — banner de rollover.
- `RelatedSelector.tsx` — selector de entidad relacionada (campaign/brand/talent).

## Archivos a partir (>300 LOC)

- `TaskList.tsx` (469) — split list/row/filters.

## Server vs Client

- **Client**: todos los workspace/modal.
- **Server**: badges, banner.

## Dependencias clave

- `@/lib/queries/crmTasks`, `taskTemplates`.
- `@/lib/permissions`.
