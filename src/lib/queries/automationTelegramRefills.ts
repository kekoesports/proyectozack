import { and, asc, eq, sql } from 'drizzle-orm';

import { crmTasks, user } from '@/db/schema';
import {
  buildTelegramRefillDescription,
  buildTelegramRefillTitle,
  telegramRefillExternalId,
  todayMadridIso,
} from '@/lib/automation/telegramRefills';
import { db } from '@/lib/db';
import type { AutomationTelegramRefillCreateInput } from '@/lib/schemas/automationTelegramRefill';
import { getIsoWeekLabel } from '@/lib/utils/week';

export type AutomationTelegramRefillTask = {
  readonly id: number;
  readonly title: string;
  readonly status: string;
};

export type AutomationTelegramRefillCreateResult = {
  readonly created: boolean;
  readonly task: AutomationTelegramRefillTask;
};

export async function createAutomationTelegramRefill(
  input: AutomationTelegramRefillCreateInput,
  now = new Date(),
): Promise<AutomationTelegramRefillCreateResult> {
  const externalId = telegramRefillExternalId(input.updateId);
  const description = buildTelegramRefillDescription(input);

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${externalId}))`);

    const [existing] = await tx
      .select({ id: crmTasks.id, title: crmTasks.title, status: crmTasks.status })
      .from(crmTasks)
      .where(and(eq(crmTasks.category, 'Refill'), eq(crmTasks.description, description)))
      .limit(1);

    if (existing) return { created: false, task: existing };

    const [admin] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, 'admin'))
      .orderBy(asc(user.createdAt))
      .limit(1);

    if (!admin) throw new Error('No admin user available for Telegram refill assignment');

    const [task] = await tx
      .insert(crmTasks)
      .values({
        title: buildTelegramRefillTitle(input),
        description,
        ownerId: admin.id,
        assignedToUserId: admin.id,
        createdByUserId: admin.id,
        dueDate: todayMadridIso(now),
        priority: 'alta',
        status: 'pendiente',
        category: 'Refill',
        weekLabel: getIsoWeekLabel(now),
        relatedType: 'general',
      })
      .returning({ id: crmTasks.id, title: crmTasks.title, status: crmTasks.status });

    if (!task) throw new Error('Failed to insert Telegram refill task');
    return { created: true, task };
  });
}

export async function getAutomationTelegramRefill(
  taskId: number,
): Promise<AutomationTelegramRefillTask | null> {
  const [task] = await db
    .select({ id: crmTasks.id, title: crmTasks.title, status: crmTasks.status })
    .from(crmTasks)
    .where(and(eq(crmTasks.id, taskId), eq(crmTasks.category, 'Refill')))
    .limit(1);
  return task ?? null;
}
