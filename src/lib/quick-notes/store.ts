import { and, desc, eq, ilike, inArray, isNull, isNotNull } from 'drizzle-orm';
import { crmTasks } from '@/db/schema/crmTasks';
import { assertCanDelete } from '@/lib/permissions';
import {
  quickNotes,
  quickNoteShares,
  quickNoteConversions,
  quickNoteEvents,
} from '@/db/schema/quickNotes';
import {
  SaveQuickNote,
  EditQuickNote,
  DeleteQuickNote,
  NoteList,
  NoteSharing,
  type NoteActor,
  NoteRelation,
  NoteSuggestion,
} from '@/lib/schemas/quickNote';
import { interpretQuickNote, type NoteUser } from './interpret';
import { canReadTask } from './access';
import {
  accessibleNote,
  accessibleRelation,
  assertNotes,
  noteUsers,
  noteError,
  type NoteDatabase,
} from './store-shared';
import { convertQuickNote, undoQuickNoteConversion } from './conversion';

export function createQuickNoteStore(database: NoteDatabase) {
  return {
    async save(actor: NoteActor, input: unknown) {
      assertNotes(actor);
      const parsed = SaveQuickNote.safeParse(input);
      if (!parsed.success)
        noteError('Escribe una nota válida (máximo 4000 caracteres).');
      const data = parsed.data;
      return database.transaction(async (tx) => {
        await accessibleRelation(tx, actor, data.relation);
        await tx
          .insert(quickNotes)
          .values({
            id: data.id,
            ownerId: actor.userId,
            body: data.body,
            originalText: data.body,
            mode: data.mode,
            relatedType: data.relation?.type,
            relatedId: data.relation?.id,
          })
          .onConflictDoNothing();
        const note = await accessibleNote(tx, actor, data.id, true);
        if (
          note.originalText !== data.body ||
          note.mode !== data.mode ||
          note.relatedType !== (data.relation?.type ?? null) ||
          note.relatedId !== (data.relation?.id ?? null)
        )
          noteError(
            'Este guardado ya existe con otro contenido. Recupera la nota.',
            'CONFLICT',
          );
        return note;
      });
    },
    async edit(actor: NoteActor, input: unknown) {
      const parsed = EditQuickNote.safeParse(input);
      if (!parsed.success) noteError('Revisa el texto de la nota.');
      const data = parsed.data;
      return database.transaction(async (tx) => {
        const note = await accessibleNote(tx, actor, data.id, true);
        if (note.version !== data.version)
          noteError(
            'La nota cambió en otra pestaña. Actualiza antes de guardar.',
            'CONFLICT',
          );
        await tx
          .insert(quickNoteEvents)
          .values({
            noteId: note.id,
            actorId: actor.userId,
            kind: 'edited',
            detail: { previousBody: note.body, previousVersion: note.version },
          });
        const [updated] = await tx
          .update(quickNotes)
          .set({
            body: data.body,
            version: note.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(quickNotes.id, note.id))
          .returning();
        return updated;
      });
    },
    async detail(actor: NoteActor, id: string) {
      return database.transaction(async (tx) => {
        const note = await accessibleNote(tx, actor, id);
        const [conversion] = await tx
          .select()
          .from(quickNoteConversions)
          .where(eq(quickNoteConversions.noteId, id));
        const [task] = conversion?.taskId
          ? await tx
              .select()
              .from(crmTasks)
              .where(eq(crmTasks.id, conversion.taskId))
          : [];
        const shares =
          note.ownerId === actor.userId
            ? await tx
                .select({ userId: quickNoteShares.userId })
                .from(quickNoteShares)
                .where(eq(quickNoteShares.noteId, id))
            : [];
        const relation = NoteRelation.safeParse({
          type: note.relatedType,
          id: note.relatedId,
        });
        // Sharing the text does not grant access to related CRM entities.
        let related = null;
        if (relation.success) {
          try {
            related = await accessibleRelation(tx, actor, relation.data);
          } catch {
            related = null;
          }
        }
        return {
          note,
          conversion: conversion ?? null,
          task: task && canReadTask(actor, task) ? task : null,
          shares,
          relation: related,
        };
      });
    },
    async list(actor: NoteActor, input: unknown) {
      assertNotes(actor);
      const parsed = NoteList.safeParse(input);
      if (!parsed.success) noteError('Filtros inválidos.');
      const data = parsed.data;
      const shared =
        data.view === 'shared'
          ? await database
              .select({ id: quickNoteShares.noteId })
              .from(quickNoteShares)
              .where(eq(quickNoteShares.userId, actor.userId))
          : [];
      if (data.view === 'shared' && !shared.length) return [];
      const rows = await database
        .select({
          note: quickNotes,
          conversion: quickNoteConversions,
          task: crmTasks,
        })
        .from(quickNotes)
        .leftJoin(
          quickNoteConversions,
          eq(quickNoteConversions.noteId, quickNotes.id),
        )
        .leftJoin(crmTasks, eq(crmTasks.id, quickNoteConversions.taskId))
        .where(
          and(
            data.view === 'mine'
              ? eq(quickNotes.ownerId, actor.userId)
              : inArray(
                  quickNotes.id,
                  shared.map((r) => r.id),
                ),
            data.archived
              ? isNotNull(quickNotes.archivedAt)
              : isNull(quickNotes.archivedAt),
            data.search
              ? ilike(
                  quickNotes.body,
                  '%' + data.search.replace(/[\\%_]/g, '\\$&') + '%',
                )
              : undefined,
          ),
        )
        .orderBy(desc(quickNotes.updatedAt));
      return rows
        .filter(
          (row) =>
            data.filter === 'all' ||
            (!!row.conversion && !row.conversion.undoneAt) ===
              (data.filter === 'tasks'),
        )
        .map((row) => ({
          ...row,
          task: row.task && canReadTask(actor, row.task) ? row.task : null,
        }));
    },
    async share(actor: NoteActor, input: unknown) {
      const parsed = NoteSharing.safeParse(input);
      if (!parsed.success) noteError('Revisa los destinatarios.');
      const data = parsed.data;
      return database.transaction(async (tx) => {
        await accessibleNote(tx, actor, data.id, true);
        const users = await noteUsers(tx, actor);
        if (data.userIds.some((id) => !users.some((u) => u.id === id)))
          noteError('Un destinatario no tiene acceso a notas.', 'FORBIDDEN');
        await tx
          .delete(quickNoteShares)
          .where(eq(quickNoteShares.noteId, data.id));
        const unique = [...new Set(data.userIds)].filter(
          (id) => id !== actor.userId,
        );
        if (unique.length)
          await tx
            .insert(quickNoteShares)
            .values(unique.map((userId) => ({ noteId: data.id, userId })));
        await tx
          .insert(quickNoteEvents)
          .values({
            noteId: data.id,
            actorId: actor.userId,
            kind: 'sharing_changed',
            detail: { userIds: unique },
          });
      });
    },
    async remove(actor: NoteActor, input: unknown) {
      assertNotes(actor);
      assertCanDelete(actor.role);
      const parsed = DeleteQuickNote.safeParse(input);
      if (!parsed.success) noteError('Confirma el borrado de una nota válida.');
      return database.transaction(async (tx) => {
        const note = await accessibleNote(tx, actor, parsed.data.id, true);
        if (note.version !== parsed.data.version)
          noteError('La nota cambió. Revísala antes de eliminarla.', 'CONFLICT');
        // Cascades remove note shares/history/conversion only; the linked task survives.
        await tx.delete(quickNotes).where(and(eq(quickNotes.id, note.id), eq(quickNotes.ownerId, actor.userId)));
        return { id: note.id };
      });
    },
    async archive(actor: NoteActor, id: string, archived: boolean) {
      return database.transaction(async (tx) => {
        await accessibleNote(tx, actor, id, true);
        await tx
          .update(quickNotes)
          .set({
            archivedAt: archived ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(quickNotes.id, id));
        await tx
          .insert(quickNoteEvents)
          .values({
            noteId: id,
            actorId: actor.userId,
            kind: archived ? 'archived' : 'restored',
          });
      });
    },
    convert: (actor: NoteActor, input: unknown) =>
      convertQuickNote(database, actor, input),
    undo: (actor: NoteActor, id: string) =>
      undoQuickNoteConversion(database, actor, id),
    users: (actor: NoteActor) => noteUsers(database, actor),
    relation: (actor: NoteActor, input: unknown) => {
      const parsed = NoteRelation.safeParse(input);
      assertNotes(actor);
      return parsed.success
        ? accessibleRelation(database, actor, parsed.data)
        : Promise.resolve(null);
    },
  };
}

export async function saveAndInterpretNote(
  store: ReturnType<typeof createQuickNoteStore>,
  actor: NoteActor,
  input: unknown,
  interpret: (
    body: string,
    at: Date,
    actor: NoteActor,
    users: readonly NoteUser[],
  ) => NoteSuggestion = interpretQuickNote,
) {
  // Commit the original text first. Interpretation/conversion failure must not roll it back.
  const note = await store.save(actor, input);
  if (note.mode === 'note')
    return { note, suggestion: null, taskId: null, warning: null };
  try {
    const detail = await store.detail(actor, note.id);
    if (detail.conversion)
      return {
        note,
        suggestion: null,
        taskId: detail.conversion.taskId,
        warning: detail.conversion.undoneAt
          ? 'Conversión deshecha; se conserva su historial.'
          : null,
      };
    const suggestionResult = NoteSuggestion.safeParse(
      interpret(note.body, note.createdAt, actor, await store.users(actor)),
    );
    if (!suggestionResult.success) noteError('No se pudo interpretar la nota.');
    const suggestion = suggestionResult.data;
    if (
      suggestion.kind === 'action' ||
      (note.mode === 'task' && suggestion.kind === 'information')
    ) {
      const converted = await store.convert(actor, {
        id: note.id,
        version: note.version,
        title: suggestion.title,
        assigneeId: suggestion.assigneeId,
        startDate: suggestion.startDate,
        dueDate: suggestion.dueDate,
        remindAt: suggestion.remindAt,
        priority: 'media',
        confirmDisclosure: false,
      });
      return { note, suggestion, taskId: converted.taskId, warning: null };
    }
    return { note, suggestion, taskId: null, warning: null };
  } catch {
    return {
      note,
      suggestion: null,
      taskId: null,
      warning:
        'Nota guardada. No se pudo crear o interpretar la tarea; puedes convertirla manualmente.',
    };
  }
}
