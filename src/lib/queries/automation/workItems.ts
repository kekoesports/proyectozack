'server-only';

import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { crmBrandContacts, crmBrandFollowups, crmBrands, crmTasks } from '@/db/schema';
import { db } from '@/lib/db';
import { createTask } from '@/lib/queries/crmTasks';
import { getIsoWeekLabel } from '@/lib/utils/week';
import type { FollowupPatch, TaskCreate, TaskPatch } from '@/lib/schemas/integrationApi';

type FollowupFilters = {
  brandId?: number | undefined;
  status?: 'pendiente' | 'hecho' | 'vencido' | undefined;
  dueBefore?: string | undefined;
  limit: number;
  offset: number;
};

export async function listAutomationFollowups(filters: FollowupFilters) {
  const conditions = [];
  if (filters.brandId) conditions.push(eq(crmBrandFollowups.brandId, filters.brandId));
  if (filters.status) conditions.push(eq(crmBrandFollowups.status, filters.status));
  if (filters.dueBefore) conditions.push(lte(crmBrandFollowups.scheduledAt, new Date(filters.dueBefore)));
  return db
    .select({
      id: crmBrandFollowups.id,
      brandId: crmBrandFollowups.brandId,
      brandName: crmBrands.name,
      primaryContactName: crmBrandContacts.name,
      primaryContactEmail: crmBrandContacts.email,
      scheduledAt: crmBrandFollowups.scheduledAt,
      status: crmBrandFollowups.status,
      priority: crmBrandFollowups.priority,
      channel: crmBrandFollowups.channel,
      note: crmBrandFollowups.note,
      summary: crmBrandFollowups.summary,
      nextAction: crmBrandFollowups.nextAction,
      nextActionAt: crmBrandFollowups.nextActionAt,
      completedAt: crmBrandFollowups.completedAt,
      assignedToUserId: crmBrandFollowups.assignedToUserId,
      updatedAt: crmBrandFollowups.updatedAt,
    })
    .from(crmBrandFollowups)
    .innerJoin(crmBrands, eq(crmBrands.id, crmBrandFollowups.brandId))
    .leftJoin(
      crmBrandContacts,
      and(
        eq(crmBrandContacts.brandId, crmBrands.id),
        eq(crmBrandContacts.isPrimary, true),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(crmBrandFollowups.scheduledAt))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function patchAutomationFollowup(id: number, input: FollowupPatch) {
  const now = new Date();
  const [row] = await db
    .update(crmBrandFollowups)
    .set({
      status: input.status,
      summary: input.summary,
      nextAction: input.nextAction,
      nextActionAt: input.nextActionAt === undefined
        ? undefined
        : input.nextActionAt === null ? null : new Date(input.nextActionAt),
      completedAt: input.completedAt === undefined
        ? input.status === 'hecho' ? now : undefined
        : input.completedAt === null ? null : new Date(input.completedAt),
      updatedAt: now,
    })
    .where(eq(crmBrandFollowups.id, id))
    .returning();
  return row ?? null;
}

type TaskFilters = {
  status?: 'pendiente' | 'en_progreso' | 'completada' | undefined;
  relatedType?: 'brand' | 'talent' | 'campaign' | 'invoice' | 'general' | undefined;
  relatedId?: number | undefined;
  dueBefore?: string | undefined;
  limit: number;
  offset: number;
};

export async function listAutomationTasks(filters: TaskFilters) {
  const conditions = [];
  if (filters.status) conditions.push(eq(crmTasks.status, filters.status));
  if (filters.relatedType) conditions.push(eq(crmTasks.relatedType, filters.relatedType));
  if (filters.relatedId) conditions.push(eq(crmTasks.relatedId, filters.relatedId));
  if (filters.dueBefore) conditions.push(lte(crmTasks.dueDate, filters.dueBefore));
  return db
    .select()
    .from(crmTasks)
    .where(and(...conditions))
    .orderBy(asc(crmTasks.dueDate), desc(crmTasks.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function createAutomationTask(input: TaskCreate) {
  const weekDate = input.dueDate
    ? new Date(`${input.dueDate}T12:00:00Z`)
    : new Date();
  const task = await createTask({
    title: input.title,
    description: input.description ?? null,
    ownerId: input.ownerId,
    assignedToUserId: input.assignedToUserId ?? input.ownerId,
    createdByUserId: null,
    recurrenceTemplateId: null,
    startDate: null,
    dueDate: input.dueDate ?? null,
    priority: input.priority,
    status: 'pendiente',
    category: input.category,
    weekLabel: getIsoWeekLabel(weekDate),
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null,
    automationKey: input.automationKey ?? null,
  });
  return task;
}

export async function patchAutomationTask(id: number, input: TaskPatch) {
  const now = new Date();
  const [row] = await db
    .update(crmTasks)
    .set({
      status: input.status,
      dueDate: input.dueDate,
      description: input.description,
      priority: input.priority,
      completedAt: input.status === 'completada' ? now : input.status ? null : undefined,
      updatedAt: now,
    })
    .where(eq(crmTasks.id, id))
    .returning();
  return row ?? null;
}
