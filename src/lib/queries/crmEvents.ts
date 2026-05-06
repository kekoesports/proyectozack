import { and, gte, lt, or, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmEvents } from '@/db/schema';
import type { CrmEvent, NewCrmEvent } from '@/types';
import type { Role } from '@/lib/auth-guard';
import { needsVisibilityFilter } from '@/lib/permissions';

/**
 * Devuelve los eventos de un rango de fechas visibles para el usuario.
 * Staff ve solo eventos donde es creador o asistente.
 * Admin/manager ven todos.
 */
export async function getEventsForMonth(
  year: number,
  month: number,
  opts: { readonly userId: string; readonly role: Role },
  monthsAhead = 3,
): Promise<readonly CrmEvent[]> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd   = new Date(Date.UTC(year, month - 1 + monthsAhead + 1, 1));

  const visibilityClause = needsVisibilityFilter(opts.role)
    ? or(
        eq(crmEvents.createdByUserId, opts.userId),
        sql`${crmEvents.attendees} @> ${JSON.stringify([opts.userId])}::jsonb`,
      )
    : undefined;

  return db
    .select()
    .from(crmEvents)
    .where(and(
      gte(crmEvents.startAt, monthStart),
      lt(crmEvents.startAt, monthEnd),
      visibilityClause,
    ))
    .orderBy(crmEvents.startAt);
}

/** Crea un nuevo evento. */
export async function createCrmEvent(data: NewCrmEvent): Promise<CrmEvent> {
  const [row] = await db.insert(crmEvents).values(data).returning();
  if (!row) throw new Error('Event insert failed');
  return row;
}

/** Elimina un evento. Solo el creador puede borrar. */
export async function deleteCrmEvent(id: number, creatorId: string): Promise<void> {
  await db
    .delete(crmEvents)
    .where(and(eq(crmEvents.id, id), eq(crmEvents.createdByUserId, creatorId)));
}
