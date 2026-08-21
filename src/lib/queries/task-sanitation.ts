import { and, asc, desc, eq, getTableColumns, inArray, isNotNull, lt, or } from 'drizzle-orm';

import { crmTasks } from '@/db/schema';
import { crmTaskTemplates } from '@/db/schema/crmTaskTemplates';
import type { Role } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { CRM_TASK_OPEN_STATUSES, isOpenTaskStatus } from '@/lib/schemas/task';
import type { SanitationAction } from '@/lib/task-rollover-policy';
import { getIsoWeekLabel } from '@/lib/utils/week';
import type { CrmTask } from '@/types';

type TaskSession = {
  readonly userId: string;
  readonly role: Role;
};

function visibilityCondition(session?: TaskSession) {
  if (!session || session.role === 'admin') return undefined;
  return or(
    eq(crmTasks.assignedToUserId, session.userId),
    eq(crmTasks.createdByUserId, session.userId),
    eq(crmTasks.ownerId, session.userId),
  );
}

export type SanitationQueueRow = CrmTask & {
  readonly recurrence: string | null;
};

export async function listTaskSanitationQueue(opts: {
  readonly weekLabel: string;
  readonly todayIso: string;
  readonly session?: TaskSession;
}): Promise<readonly SanitationQueueRow[]> {
  const visible = visibilityCondition(opts.session);
  return db
    .select({
      ...getTableColumns(crmTasks),
      recurrence: crmTaskTemplates.recurrence,
    })
    .from(crmTasks)
    .leftJoin(crmTaskTemplates, eq(crmTaskTemplates.id, crmTasks.recurrenceTemplateId))
    .where(
      and(
        inArray(crmTasks.status, [...CRM_TASK_OPEN_STATUSES]),
        or(
          eq(crmTasks.rolledOver, true),
          and(isNotNull(crmTasks.dueDate), lt(crmTasks.dueDate, opts.todayIso)),
          lt(crmTasks.weekLabel, opts.weekLabel),
        ),
        visible,
      ),
    )
    .orderBy(asc(crmTasks.dueDate), desc(crmTasks.createdAt))
    .limit(200);
}

export async function sanitizeTask(input: {
  readonly taskId: number;
  readonly action: SanitationAction;
  readonly dueDate?: string;
  readonly note?: string;
  readonly session: TaskSession;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const [task] = await db
    .select({
      id: crmTasks.id,
      status: crmTasks.status,
      assignedToUserId: crmTasks.assignedToUserId,
      createdByUserId: crmTasks.createdByUserId,
      ownerId: crmTasks.ownerId,
    })
    .from(crmTasks)
    .where(eq(crmTasks.id, input.taskId))
    .limit(1);

  if (!task) return { ok: false, error: 'Tarea no encontrada' };
  if (!isOpenTaskStatus(task.status)) return { ok: false, error: 'La tarea ya está cerrada' };

  if (input.session.role !== 'admin') {
    const owns =
      task.assignedToUserId === input.session.userId
      || task.createdByUserId === input.session.userId
      || task.ownerId === input.session.userId;
    if (!owns) return { ok: false, error: 'Tarea no visible' };
  }

  const now = new Date();
  const patch = patchForAction(input.action, input.dueDate, input.note, now);
  if ('error' in patch) return { ok: false, error: patch.error };

  await db.update(crmTasks).set(patch).where(eq(crmTasks.id, input.taskId));
  return { ok: true };
}

function patchForAction(
  action: SanitationAction,
  dueDate: string | undefined,
  note: string | undefined,
  now: Date,
): {
  status?: 'pendiente' | 'completada' | 'omitida' | 'archivada';
  completedAt?: Date;
  dueDate?: string;
  weekLabel?: string;
  rolledOver: boolean;
  rolledFromWeek?: string | null;
  rolloverNote: string | null;
  updatedAt: Date;
} | { error: string } {
  const noteValue = note ?? null;
  if (action === 'keep') {
    return { rolledOver: false, rolledFromWeek: null, rolloverNote: noteValue, updatedAt: now };
  }
  if (action === 'complete') {
    return {
      status: 'completada',
      completedAt: now,
      rolledOver: false,
      rolloverNote: noteValue,
      updatedAt: now,
    };
  }
  if (action === 'omit') {
    return {
      status: 'omitida',
      completedAt: now,
      rolledOver: false,
      rolloverNote: noteValue,
      updatedAt: now,
    };
  }
  if (action === 'archive') {
    return {
      status: 'archivada',
      completedAt: now,
      rolledOver: false,
      rolloverNote: noteValue,
      updatedAt: now,
    };
  }
  if (!dueDate) return { error: 'La reprogramación requiere una fecha' };
  return {
    status: 'pendiente',
    dueDate,
    weekLabel: getIsoWeekLabel(new Date(`${dueDate}T12:00:00`)),
    rolledOver: false,
    rolledFromWeek: null,
    rolloverNote: noteValue,
    updatedAt: now,
  };
}
