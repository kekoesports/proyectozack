'use server';

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { requirePermission } from '@/lib/permissions';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { NoteIdentity } from '@/lib/schemas/quickNote';
import {
  createQuickNoteStore,
  saveAndInterpretNote,
} from '@/lib/quick-notes/store';
import { interpretQuickNote } from '@/lib/quick-notes/interpret';
import { createTaskNoticeStore } from '@/lib/quick-notes/notices';

const store = createQuickNoteStore(db);
const notices = createTaskNoticeStore(db);
async function execute<T>(action: () => Promise<T>) {
  if (!env.QUICK_NOTES_ENABLED)
    return {
      ok: false as const,
      error: 'Las notas rápidas todavía no están activadas.',
    };
  try {
    return { ok: true as const, data: await action() };
  } catch (error: unknown) {
    return {
      ok: false as const,
      error:
        error instanceof TRPCError
          ? error.message
          : 'No se pudo guardar. Conservamos el texto para que puedas reintentar.',
    };
  }
}
export async function saveQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  return execute(() =>
    saveAndInterpretNote(
      store,
      { userId: session.user.id, role: session.user.role },
      input,
    ),
  );
}
export async function listQuickNotesAction(input: unknown) {
  const session = await requirePermission('tareas', 'read');
  return execute(() =>
    store.list({ userId: session.user.id, role: session.user.role }, input),
  );
}
export async function quickNoteDetailAction(input: unknown) {
  const session = await requirePermission('tareas', 'read');
  const parsed = NoteIdentity.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Nota inválida.' };
  return execute(() =>
    store.detail(
      { userId: session.user.id, role: session.user.role },
      parsed.data.id,
    ),
  );
}
export async function editQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  return execute(() =>
    store.edit({ userId: session.user.id, role: session.user.role }, input),
  );
}
export async function convertQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  return execute(async () => {
    const actor = { userId: session.user.id, role: session.user.role };
    const conversion = await store.convert(actor, input);
    const detail = await store.detail(actor, conversion.noteId);
    const people = await store.users(actor);
    return {
      ...conversion,
      summary: detail.task
        ? {
            assigneeName:
              people.find((u) => u.id === detail.task?.ownerId)?.name ??
              'Usuario',
            priority: detail.task.priority,
            startDate: detail.task.startDate,
            dueDate: detail.task.dueDate,
          }
        : null,
    };
  });
}
export async function undoQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  const parsed = NoteIdentity.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Nota inválida.' };
  return execute(() =>
    store.undo(
      { userId: session.user.id, role: session.user.role },
      parsed.data.id,
    ),
  );
}
export async function shareQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  return execute(() =>
    store.share({ userId: session.user.id, role: session.user.role }, input),
  );
}
export async function archiveQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  const parsed = NoteIdentity.extend({ archived: z.boolean() }).safeParse(
    input,
  );
  if (!parsed.success) return { ok: false as const, error: 'Nota inválida.' };
  return execute(() =>
    store.archive(
      { userId: session.user.id, role: session.user.role },
      parsed.data.id,
      parsed.data.archived,
    ),
  );
}
export async function deleteQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'delete');
  return execute(() =>
    store.remove({ userId: session.user.id, role: session.user.role }, input),
  );
}
export async function quickNoteOptionsAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  const parsed = z.string().max(500).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Ruta inválida.' };
  return execute(async () => {
    const actor = { userId: session.user.id, role: session.user.role };
    const match = /^\/admin\/(campanas|brands|talents)\/(\d+)(?:\/|$)/.exec(
      parsed.data,
    );
    let relation = null;
    if (match) {
      try {
        relation = await store.relation(actor, {
          type:
            match[1] === 'campanas'
              ? 'campaign'
              : match[1] === 'brands'
                ? 'brand'
                : 'talent',
          id: Number(match[2]),
        });
      } catch {
        relation = null;
      }
    }
    return { users: await store.users(actor), relation };
  });
}
export async function proposeQuickNoteAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  const parsed = NoteIdentity.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Nota inválida.' };
  return execute(async () => {
    const actor = { userId: session.user.id, role: session.user.role };
    const { note } = await store.detail(actor, parsed.data.id);
    return interpretQuickNote(
      note.body,
      note.createdAt,
      actor,
      await store.users(actor),
    );
  });
}
export async function pollTaskNoticesAction(input: unknown) {
  const session = await requirePermission('tareas', 'read');
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: 'Pestaña inválida.' };
  return execute(() =>
    notices.poll(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    ),
  );
}
export async function changeTaskNoticesAction(input: unknown) {
  const session = await requirePermission('tareas', 'read');
  return execute(() =>
    notices.change({ userId: session.user.id, role: session.user.role }, input),
  );
}
export async function saveTaskNoticeSettingsAction(input: unknown) {
  const session = await requirePermission('tareas', 'write');
  return execute(() =>
    notices.settings(
      { userId: session.user.id, role: session.user.role },
      input,
    ),
  );
}
