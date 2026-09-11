import { and, asc, eq, inArray, isNotNull, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { alerts, crmTasks, user } from '@/db/schema';
import { taskNoticeSettings } from '@/db/schema/quickNotes';
import {
  NoticeChange,
  NoticeSettings,
  type NoteActor,
} from '@/lib/schemas/quickNote';
import { assertNotes, noteError, type NoteDatabase } from './store-shared';
import { canUseQuickNotes } from './access';
import { civilDate, inNoticeHours } from './time';

export const TASK_NOTICE_TYPES = ['important_task_overdue', 'task_reminder'];
const defaultSettings = {
  timezone: 'Europe/Madrid',
  startHour: 9,
  endHour: 20,
  weekdaysOnly: true,
};
const Metadata = z.object({ condition: z.string() });
type Task = typeof crmTasks.$inferSelect;
function qualifies(task: Task, type: string, now: Date): boolean {
  if (!['pendiente', 'en_progreso'].includes(task.status)) return false;
  return type === 'important_task_overdue'
    ? task.priority === 'alta' &&
        !!task.dueDate &&
        task.dueDate < civilDate(now)
    : type === 'task_reminder' && !!task.remindAt && task.remindAt <= now;
}

/** Existing crm_alerts, distinct per recipient/task/kind. No three-row dashboard limit. */
export async function syncTaskNotices(
  database: NoteDatabase,
  now = new Date(),
  userId?: string,
) {
  return database.transaction(async (tx) => {
    const people = await tx.select({ id: user.id, role: user.role }).from(user);
    const allowed = new Set(
      people.filter((u) => canUseQuickNotes(u.role ?? '')).map((u) => u.id),
    );
    const tasks = await tx
      .select()
      .from(crmTasks)
      .where(
        and(
          inArray(crmTasks.status, ['pendiente', 'en_progreso']),
          userId
            ? or(
                eq(crmTasks.ownerId, userId),
                eq(crmTasks.assignedToUserId, userId),
              )
            : undefined,
          or(
            and(eq(crmTasks.priority, 'alta'), isNotNull(crmTasks.dueDate)),
            lte(crmTasks.remindAt, now),
          ),
        ),
      )
      .orderBy(asc(crmTasks.id))
      .for('update');
    const existing = await tx
      .select()
      .from(alerts)
      .where(
        and(
          inArray(alerts.type, TASK_NOTICE_TYPES),
          userId ? eq(alerts.assignedToUserId, userId) : undefined,
        ),
      )
      .for('update');
    const wanted = new Set<string>();
    let created = 0;
    for (const task of tasks) {
      for (const type of TASK_NOTICE_TYPES) {
        if (!qualifies(task, type, now)) continue;
        for (const recipient of new Set(
          [task.ownerId, task.assignedToUserId].filter(
            (id): id is string => !!id,
          ),
        )) {
          if (!allowed.has(recipient) || (userId && recipient !== userId))
            continue;
          const key = type + ':' + task.id + ':' + recipient;
          wanted.add(key);
          const condition =
            type === 'important_task_overdue'
              ? (task.dueDate ?? '')
              : (task.remindAt?.toISOString() ?? '');
          const previous = existing.find((a) => a.dedupeKey === key);
          const metadata = Metadata.safeParse(previous?.metadata);
          const values = {
            type,
            title: task.title,
            description:
              type === 'important_task_overdue'
                ? 'Tarea de prioridad alta vencida.'
                : 'Recordatorio programado.',
            severity: type === 'important_task_overdue' ? 'high' : 'medium',
            assignedToUserId: recipient,
            relatedEntityType: 'task',
            relatedEntityId: task.id,
            dueDate: task.dueDate,
            dedupeKey: key,
            metadata: { condition },
          };
          if (!previous) {
            const inserted = await tx
              .insert(alerts)
              .values(values)
              .onConflictDoNothing()
              .returning({ id: alerts.id });
            created += inserted.length;
          } else if (
            previous.status === 'resolved' ||
            !metadata.success ||
            metadata.data.condition !== condition
          ) {
            await tx
              .update(alerts)
              .set({
                ...values,
                status: 'active',
                resolvedAt: null,
                readAt: null,
                snoozedUntilAt: null,
                presentedAt: null,
                deliveryToken: null,
                deliveryUntil: null,
                updatedAt: now,
              })
              .where(eq(alerts.id, previous.id));
          } else if (previous.title !== task.title) {
            await tx
              .update(alerts)
              .set({ title: task.title, updatedAt: now })
              .where(eq(alerts.id, previous.id));
          }
        }
      }
    }
    const stale = existing
      .filter(
        (a) =>
          a.dedupeKey && !wanted.has(a.dedupeKey) && a.status !== 'resolved',
      )
      .map((a) => a.id);
    if (stale.length)
      await tx
        .update(alerts)
        .set({
          status: 'resolved',
          resolvedAt: now,
          snoozedUntilAt: null,
          deliveryToken: null,
          deliveryUntil: null,
          updatedAt: now,
        })
        .where(inArray(alerts.id, stale));
    return { created, resolved: stale.length };
  });
}

export function createTaskNoticeStore(database: NoteDatabase) {
  return {
    async poll(actor: NoteActor, tabId: string, now = new Date()) {
      assertNotes(actor);
      if (!z.uuid().safeParse(tabId).success)
        noteError('Identificador de pestaña inválido.');
      await syncTaskNotices(database, now, actor.userId);
      return database.transaction(async (tx) => {
        const [savedSettings] = await tx
          .select()
          .from(taskNoticeSettings)
          .where(eq(taskNoticeSettings.userId, actor.userId));
        const settings = savedSettings ?? defaultSettings;
        const rows = await tx
          .select()
          .from(alerts)
          .where(
            and(
              eq(alerts.assignedToUserId, actor.userId),
              inArray(alerts.type, TASK_NOTICE_TYPES),
              eq(alerts.status, 'active'),
            ),
          )
          .orderBy(asc(alerts.id))
          .for('update');
        const claimed: number[] = [];
        if (inNoticeHours(now, settings)) {
          for (const row of rows) {
            if (row.readAt || (row.snoozedUntilAt && row.snoozedUntilAt > now))
              continue;
            if (row.presentedAt && row.deliveryToken !== tabId) continue;
            if (
              row.deliveryToken !== tabId &&
              row.deliveryUntil &&
              row.deliveryUntil > now
            )
              continue;
            claimed.push(row.id);
            await tx
              .update(alerts)
              .set({
                deliveryToken: tabId,
                deliveryUntil: new Date(now.getTime() + 120_000),
              })
              .where(eq(alerts.id, row.id));
          }
        }
        return {
          settings,
          notices: rows.map((row) => ({
            id: row.id,
            title: row.title,
            taskId: row.relatedEntityId,
            type: row.type,
            dueDate: row.dueDate,
            readAt: row.readAt?.toISOString() ?? null,
            snoozedUntil: row.snoozedUntilAt?.toISOString() ?? null,
            claimed: claimed.includes(row.id),
          })),
        };
      });
    },
    async change(actor: NoteActor, input: unknown, now = new Date()) {
      assertNotes(actor);
      const parsed = NoticeChange.safeParse(input);
      if (!parsed.success) noteError('Aviso inválido.');
      const data = parsed.data;
      const until = data.until ? new Date(data.until) : null;
      if (
        data.action === 'snooze' &&
        (!until ||
          until <= now ||
          until.getTime() > now.getTime() + 366 * 86_400_000)
      )
        noteError('Elige un momento futuro, dentro del próximo año.');
      await syncTaskNotices(database, now, actor.userId);
      await database.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(alerts)
          .where(
            and(
              inArray(alerts.id, data.ids),
              eq(alerts.assignedToUserId, actor.userId),
              inArray(alerts.type, TASK_NOTICE_TYPES),
            ),
          )
          .for('update');
        if (rows.length !== new Set(data.ids).size)
          noteError('No puedes modificar esos avisos.', 'FORBIDDEN');
        for (const row of rows) {
          if (row.status !== 'active') continue;
          if (data.action === 'presented') {
            if (
              row.deliveryToken === data.tabId &&
              row.deliveryUntil &&
              row.deliveryUntil > now
            ) {
              await tx
                .update(alerts)
                .set({ presentedAt: row.presentedAt ?? now })
                .where(eq(alerts.id, row.id));
            }
          } else {
            await tx
              .update(alerts)
              .set(
                data.action === 'read'
                  ? {
                      readAt: now,
                      snoozedUntilAt: null,
                      deliveryToken: null,
                      deliveryUntil: null,
                      updatedAt: now,
                    }
                  : {
                      readAt: null,
                      snoozedUntilAt: until,
                      presentedAt: null,
                      deliveryToken: null,
                      deliveryUntil: null,
                      updatedAt: now,
                    },
              )
              .where(eq(alerts.id, row.id));
          }
        }
      });
    },
    async settings(actor: NoteActor, input: unknown) {
      assertNotes(actor);
      const parsed = NoticeSettings.safeParse(input);
      if (!parsed.success) noteError('Revisa el horario de avisos.');
      await database
        .insert(taskNoticeSettings)
        .values({ userId: actor.userId, ...parsed.data })
        .onConflictDoUpdate({
          target: taskNoticeSettings.userId,
          set: parsed.data,
        });
    },
  };
}
