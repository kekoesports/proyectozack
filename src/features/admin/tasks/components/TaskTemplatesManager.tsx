'use client';

import { useState, useTransition } from 'react';

import { createTaskTemplateAction, deleteTaskTemplateAction, updateTaskTemplateAction } from '@/app/admin/(dashboard)/tareas/plantillas/actions';
import { EditDrawer } from '@/features/admin/_shared/components/EditDrawer';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { RecurrenceBadge } from './RecurrenceBadge';
import { PriorityBadge } from './PriorityBadge';
import { CRM_TASK_RECURRENCES, CRM_TASK_RECURRENCE_LABELS } from '@/lib/schemas/taskTemplate';

import type { CrmTaskRecurrence, CrmTaskTemplate, CrmTaskPriority } from '@/types';

type UserOption = { readonly id: string; readonly name: string };

type Props = {
  readonly templates: readonly CrmTaskTemplate[];
  readonly users: readonly UserOption[];
  readonly canDelete: boolean;
};

type EditableTemplate = CrmTaskTemplate | null;

function TemplateForm({
  template,
  users,
  onClose,
  canDelete,
}: {
  readonly template: EditableTemplate;
  readonly users: readonly UserOption[];
  readonly onClose: () => void;
  readonly canDelete: boolean;
}): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = template !== null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = isEditing
            ? await updateTaskTemplateAction(formData)
            : await createTaskTemplateAction(formData);
          if (result.error) {
            setError(result.error);
            return;
          }
          onClose();
        });
      }}
    >
      {isEditing && <input type="hidden" name="id" value={String(template.id)} />}

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">Título</span>
        <input name="title" defaultValue={template?.title ?? ''} className={inputCls} required maxLength={200} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">Descripción</span>
        <textarea name="description" defaultValue={template?.description ?? ''} rows={3} className={`${inputCls} resize-none`} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">Categoría</span>
          <input name="category" defaultValue={template?.category ?? ''} className={inputCls} required maxLength={40} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">Prioridad</span>
          <select name="defaultPriority" defaultValue={template?.defaultPriority ?? 'media'} className={inputCls}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">Frecuencia</span>
          <select name="recurrence" defaultValue={template?.recurrence ?? 'weekly'} className={inputCls}>
            {CRM_TASK_RECURRENCES.map((value) => (
              <option key={value} value={value}>{CRM_TASK_RECURRENCE_LABELS[value]}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">Asignado a</span>
          <select name="defaultAssigneeUserId" defaultValue={template?.defaultAssigneeUserId ?? ''} className={inputCls}>
            <option value="">Todos los usuarios internos</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-sp-admin-text">
        <input type="checkbox" name="active" defaultChecked={template?.active ?? true} />
        Activa
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-2 pt-2 border-t border-sp-admin-border">
        {isEditing && canDelete && (
          <button
            type="button"
            className="rounded-md border border-sp-admin-border px-3 py-2 text-xs text-red-400"
            onClick={() => {
              startTransition(async () => {
                const result = await deleteTaskTemplateAction(template.id);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                onClose();
              });
            }}
          >
            Borrar
          </button>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="rounded-md border border-sp-admin-border px-4 py-2 text-sm text-sp-admin-muted">
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className="rounded-md bg-sp-admin-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear plantilla'}
        </button>
      </div>
    </form>
  );
}

/**
 * Gestor CRUD de plantillas de tareas recurrentes (las 18 plantillas que el cron semanal materializa).
 * Permite crear/editar/eliminar plantillas y asignar default owner.
 *
 * @kind client
 * @feature admin/tasks
 * @route /admin/tareas/plantillas
 */
export function TaskTemplatesManager({ templates, users, canDelete }: Props): React.ReactElement {
  const [selected, setSelected] = useState<EditableTemplate>(null);
  const [open, setOpen] = useState(false);

  const assigneeMap = new Map(users.map((user) => [user.id, user.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Plantillas</h1>
          <p className="mt-1 text-sm text-sp-admin-muted">Gestiona tareas recurrentes del equipo</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setOpen(true);
          }}
          className="rounded-lg bg-sp-admin-accent px-3 py-2 text-sm font-semibold text-white"
        >
          + Nueva plantilla
        </button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="Sin plantillas"
          description="Crea la primera plantilla para generar tareas recurrentes en cada lunes."
        />
      ) : (
      <div className="overflow-hidden rounded-xl border border-sp-admin-border bg-sp-admin-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border/60 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Frecuencia</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Asignado a</th>
              <th className="px-4 py-3">Activa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-admin-border/60">
            {templates.map((template) => (
              <tr key={template.id} className="cursor-pointer hover:bg-sp-admin-hover" onClick={() => { setSelected(template); setOpen(true); }}>
                <td className="px-4 py-3">
                  <div className="font-medium text-sp-admin-text">{template.title}</div>
                  {template.description && (
                    <div className="text-xs text-sp-admin-muted line-clamp-1">{template.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sp-admin-muted">{template.category}</td>
                <td className="px-4 py-3"><RecurrenceBadge frequency={template.recurrence as CrmTaskRecurrence} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={template.defaultPriority as CrmTaskPriority} /></td>
                <td className="px-4 py-3 text-sp-admin-muted">{template.defaultAssigneeUserId ? (assigneeMap.get(template.defaultAssigneeUserId) ?? '—') : 'Todos'}</td>
                <td className="px-4 py-3 text-sp-admin-muted">{template.active ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <EditDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selected ? 'Editar plantilla' : 'Nueva plantilla'}
      >
        <TemplateForm
          template={selected}
          users={users}
          canDelete={canDelete}
          onClose={() => setOpen(false)}
        />
      </EditDrawer>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:border-sp-admin-accent focus:outline-none';
