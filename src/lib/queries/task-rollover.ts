import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { crmTasks } from '@/db/schema';
import { db } from '@/lib/db';
import { CRM_TASK_OPEN_STATUSES } from '@/lib/schemas/task';

export type RollOverResult = {
  readonly rolled: number;
  readonly closedRecurring: number;
};

/** Recurring: close in-place. One-off: move week, leave dueDate for sanitation. */
export async function rollOverPendingTasks(
  fromWeek: string,
  toWeek: string,
): Promise<RollOverResult> {
  const now = new Date();
  const open = [...CRM_TASK_OPEN_STATUSES];

  const closed = await db
    .update(crmTasks)
    .set({
      status: 'no_realizada',
      completedAt: now,
      rolledOver: false,
      updatedAt: now,
    })
    .where(
      and(
        eq(crmTasks.weekLabel, fromWeek),
        inArray(crmTasks.status, open),
        isNotNull(crmTasks.recurrenceTemplateId),
      ),
    )
    .returning({ id: crmTasks.id });

  const rolled = await db
    .update(crmTasks)
    .set({
      weekLabel: toWeek,
      rolledOver: true,
      rolledFromWeek: fromWeek,
      updatedAt: now,
    })
    .where(
      and(
        eq(crmTasks.weekLabel, fromWeek),
        inArray(crmTasks.status, open),
        isNull(crmTasks.recurrenceTemplateId),
      ),
    )
    .returning({ id: crmTasks.id });

  return { rolled: rolled.length, closedRecurring: closed.length };
}
