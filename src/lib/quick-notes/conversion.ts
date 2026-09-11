import { eq } from 'drizzle-orm';
import { crmTasks, user } from '@/db/schema';
import { quickNoteConversions, quickNoteEvents } from '@/db/schema/quickNotes';
import {
  TaskFromNote,
  NoteRelation,
  type NoteActor,
} from '@/lib/schemas/quickNote';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { canAssignTasksToOthers, canManageTask } from './access';
import {
  accessibleNote,
  accessibleRelation,
  noteError,
  type NoteDatabase,
} from './store-shared';

export async function convertQuickNote(
  database: NoteDatabase,
  actor: NoteActor,
  input: unknown,
) {
  const parsed = TaskFromNote.safeParse(input);
  if (!parsed.success) noteError('Revisa los datos de la tarea.');
  const data = parsed.data;
  return database.transaction(async (tx) => {
    const note = await accessibleNote(tx, actor, data.id, true);
    const [existing] = await tx
      .select()
      .from(quickNoteConversions)
      .where(eq(quickNoteConversions.noteId, note.id));
    if (existing?.undoneAt)
      noteError(
        'La conversión ya se deshizo. Se conserva la tarea archivada; no se creará otra.',
        'CONFLICT',
      );
    if (existing) return existing;
    if (note.archivedAt) noteError('Desarchiva la nota antes de convertirla.');
    if (note.version !== data.version)
      noteError(
        'La nota ha cambiado. Actualiza antes de convertir.',
        'CONFLICT',
      );
    if (
      data.assigneeId !== actor.userId &&
      (!canAssignTasksToOthers(actor.role) || !data.confirmDisclosure)
    ) {
      noteError(
        'No puedes asignar esa tarea sin permiso y confirmación del contenido compartido.',
        'FORBIDDEN',
      );
    }
    const [assignee] = await tx
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, data.assigneeId));
    if (
      !assignee ||
      !['admin', 'admin_limited_tasks', 'manager', 'staff'].includes(
        assignee.role ?? '',
      )
    )
      noteError('Responsable no asignable.', 'FORBIDDEN');
    const relation = NoteRelation.safeParse({
      type: note.relatedType,
      id: note.relatedId,
    });
    if (relation.success) {
      await accessibleRelation(tx, actor, relation.data);
      // A task assignment must not disclose a related entity the recipient cannot access.
      if (assignee.id !== actor.userId && assignee.role === 'staff')
        await accessibleRelation(
          tx,
          { userId: assignee.id, role: 'staff' },
          relation.data,
        );
    }
    const now = new Date();
    const [task] = await tx
      .insert(crmTasks)
      .values({
        title: data.title,
        description: null,
        ownerId: assignee.id,
        assignedToUserId: assignee.id,
        createdByUserId: actor.userId,
        category: 'General',
        priority: data.priority,
        status: 'pendiente',
        startDate: data.startDate,
        dueDate: data.dueDate,
        remindAt: data.remindAt ? new Date(data.remindAt) : null,
        weekLabel: getIsoWeekLabel(
          data.startDate || data.dueDate
            ? new Date((data.startDate ?? data.dueDate) + 'T12:00:00Z')
            : now,
        ),
        relatedType: relation.success ? relation.data.type : null,
        relatedId: relation.success ? relation.data.id : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!task) noteError('No se pudo crear la tarea.');
    const [conversion] = await tx
      .insert(quickNoteConversions)
      .values({
        noteId: note.id,
        taskId: task.id,
        taskUpdatedAt: task.updatedAt,
      })
      .returning();
    if (!conversion) noteError('No se pudo vincular la tarea.');
    await tx
      .insert(quickNoteEvents)
      .values({
        noteId: note.id,
        actorId: actor.userId,
        kind: 'converted',
        detail: {
          taskId: task.id,
          title: data.title,
          assigneeId: assignee.id,
          noteVersion: note.version,
        },
      });
    return conversion;
  });
}
export async function undoQuickNoteConversion(
  database: NoteDatabase,
  actor: NoteActor,
  id: string,
) {
  return database.transaction(async (tx) => {
    await accessibleNote(tx, actor, id, true);
    const [conversion] = await tx
      .select()
      .from(quickNoteConversions)
      .where(eq(quickNoteConversions.noteId, id))
      .for('update');
    if (!conversion || conversion.undoneAt) return;
    if (!conversion.taskId)
      noteError('La tarea ya no existe. Se conserva el historial.');
    const [task] = await tx
      .select()
      .from(crmTasks)
      .where(eq(crmTasks.id, conversion.taskId))
      .for('update');
    if (!task || !canManageTask(actor, task))
      noteError('No puedes modificar esta tarea.', 'FORBIDDEN');
    if (
      task.status !== 'pendiente' ||
      task.updatedAt.getTime() !== conversion.taskUpdatedAt.getTime()
    ) {
      noteError(
        'La tarea ya se ha gestionado. Ábrela para revisarla; no se ha modificado.',
        'CONFLICT',
      );
    }
    const now = new Date();
    await tx
      .update(crmTasks)
      .set({ status: 'archivada', updatedAt: now, completedAt: now })
      .where(eq(crmTasks.id, task.id));
    await tx
      .update(quickNoteConversions)
      .set({ undoneAt: now })
      .where(eq(quickNoteConversions.noteId, id));
    await tx
      .insert(quickNoteEvents)
      .values({
        noteId: id,
        actorId: actor.userId,
        kind: 'conversion_undone',
        detail: { taskId: task.id },
      });
  });
}
