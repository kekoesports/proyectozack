import { notFound } from 'next/navigation';
import Link from 'next/link';
import { and, eq, or } from 'drizzle-orm';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { getTaskById } from '@/lib/queries/crmTasks';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import {
  quickNotes,
  quickNoteConversions,
  quickNoteShares,
} from '@/db/schema/quickNotes';
import { user } from '@/db/schema/auth';
import { canReadTask, canManageTask } from '@/lib/quick-notes/access';
import { TaskCardActions } from '@/features/admin/tasks/components/TaskCardActions';
import { DirectTaskEditor } from '@/features/admin/quick-notes/DirectTaskEditor';
export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requirePermission('tareas', 'read');
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const task = await getTaskById(Number(id));
  const actor = { userId: session.user.id, role: session.user.role };
  if (!task || !canReadTask(actor, task)) notFound();
  const people = await db.select({ id: user.id, name: user.name }).from(user);
  const notes = env.QUICK_NOTES_ENABLED
    ? await db
        .select({ id: quickNotes.id, text: quickNotes.originalText })
        .from(quickNoteConversions)
        .innerJoin(quickNotes, eq(quickNotes.id, quickNoteConversions.noteId))
        .leftJoin(
          quickNoteShares,
          and(
            eq(quickNoteShares.noteId, quickNotes.id),
            eq(quickNoteShares.userId, actor.userId),
          ),
        )
        .where(
          and(
            eq(quickNoteConversions.taskId, task.id),
            or(
              eq(quickNotes.ownerId, actor.userId),
              eq(quickNoteShares.userId, actor.userId),
            ),
          ),
        )
    : [];
  return (
    <section className="max-w-3xl space-y-4 text-sp-admin-text">
      <Link href="/admin/tareas" className="underline text-sm">
        Volver a tareas
      </Link>
      <h1 className="text-2xl font-bold break-words">{task.title}</h1>
      <p>
        {task.status.replaceAll('_', ' ')} · Prioridad {task.priority}
      </p>
      <p>
        Responsable:{' '}
        {people.find((p) => p.id === task.ownerId)?.name ?? 'Usuario'}
      </p>
      <p>
        Trabajo: {task.startDate ?? 'Sin fecha'} · Límite:{' '}
        {task.dueDate ?? 'Sin fecha'}
      </p>
      {task.description && (
        <p className="whitespace-pre-wrap">{task.description}</p>
      )}
      {notes.map((note) => (
        <details
          key={note.id}
          className="rounded-lg border border-sp-admin-border p-3"
        >
          <summary>Nota original vinculada</summary>
          <p className="whitespace-pre-wrap break-words">{note.text}</p>
          <Link href="/admin/notas" className="underline">
            Ir a mis notas
          </Link>
        </details>
      ))}
      {canManageTask(actor, task) && <TaskCardActions task={task} canDelete={hasPermission(session.user.role, 'tareas', 'delete')} />}
      {canManageTask(actor, task) && (
        <DirectTaskEditor
          task={task}
          initialEdit={(await searchParams).edit === '1'}
        />
      )}
    </section>
  );
}
