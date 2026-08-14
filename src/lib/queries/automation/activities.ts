'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { crmActivities } from '@/db/schema';
import { db } from '@/lib/db';
import type { ActivityCreate } from '@/lib/schemas/integrationApi';

type ActivityFilters = {
  entityType?: string | undefined;
  entityId?: string | undefined;
  brandId?: number | undefined;
  campaignId?: number | undefined;
  limit: number;
  offset: number;
};

export async function listAutomationActivities(filters: ActivityFilters) {
  const conditions = [];
  if (filters.entityType) conditions.push(eq(crmActivities.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(crmActivities.entityId, filters.entityId));
  if (filters.brandId) conditions.push(eq(crmActivities.brandId, filters.brandId));
  if (filters.campaignId) conditions.push(eq(crmActivities.campaignId, filters.campaignId));

  return db
    .select()
    .from(crmActivities)
    .where(and(...conditions))
    .orderBy(desc(crmActivities.occurredAt))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function createAutomationActivity(input: ActivityCreate) {
  const [row] = await db
    .insert(crmActivities)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      activityType: input.activityType,
      channel: input.channel,
      direction: input.direction,
      summary: input.summary,
      detail: input.detail ?? null,
      source: input.source,
      externalId: input.externalId ?? null,
      brandId: input.brandId ?? null,
      campaignId: input.campaignId ?? null,
      talentId: input.talentId ?? null,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      metadata: input.metadata ?? null,
    })
    .onConflictDoNothing({ target: [crmActivities.source, crmActivities.externalId] })
    .returning();

  if (row) return { activity: row, created: true };
  if (!input.externalId) throw new Error('Activity insert returned no row');
  const [existing] = await db
    .select()
    .from(crmActivities)
    .where(and(eq(crmActivities.source, input.source), eq(crmActivities.externalId, input.externalId)))
    .limit(1);
  if (!existing) throw new Error('Activity idempotency lookup returned no row');
  return { activity: existing, created: false };
}
