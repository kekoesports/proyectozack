import 'server-only';
import { and, desc, eq, gte, lte, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveawayAuditEvents, AUDIT_ACTIONS, AUDIT_OUTCOMES, type AuditAction, type AuditOutcome } from '@/db/schema/giveawayAuditEvents';
import { user } from '@/db/schema/auth';

export const AUDIT_DEFAULT_PAGE_SIZE = 50;
export const AUDIT_MAX_PAGE_SIZE = 200;

export interface AuditEventRow {
  readonly id: number;
  readonly createdAt: Date;
  readonly action: AuditAction;
  readonly outcome: AuditOutcome;
  readonly userId: string | null;
  readonly userName: string | null;
  readonly refType: string | null;
  readonly refId: number | null;
  readonly country: string | null;
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly metadata: unknown;
}

export interface AuditFilters {
  readonly from?: Date | null;
  readonly to?: Date | null;
  readonly action?: AuditAction | null;
  readonly outcome?: AuditOutcome | null;
  readonly userId?: string | null;
  readonly refType?: string | null;
  readonly country?: string | null;
  readonly pageSize?: number;
  readonly cursor?: { createdAt: string; id: number } | null;
}

export interface AuditListResult {
  readonly rows: readonly AuditEventRow[];
  readonly nextCursor: { createdAt: string; id: number } | null;
}

/**
 * Lista `sp_audit_events` con filtros server-side. Nunca expone email del
 * usuario asociado (solo `name`). El caller debe sanear metadata antes de
 * pintar (ver `redactAuditMetadata`).
 *
 * Paginación estable con cursor `(createdAt DESC, id DESC)`.
 */
export async function listAuditEvents(filters: AuditFilters = {}): Promise<AuditListResult> {
  const pageSize = clampPageSize(filters.pageSize);

  const conditions = [] as ReturnType<typeof eq>[];
  if (filters.from) conditions.push(gte(giveawayAuditEvents.createdAt, filters.from));
  if (filters.to) conditions.push(lte(giveawayAuditEvents.createdAt, filters.to));
  if (filters.action) conditions.push(eq(giveawayAuditEvents.action, filters.action));
  if (filters.outcome) conditions.push(eq(giveawayAuditEvents.outcome, filters.outcome));
  if (filters.userId) conditions.push(eq(giveawayAuditEvents.userId, filters.userId));
  if (filters.refType) conditions.push(eq(giveawayAuditEvents.refType, filters.refType));
  if (filters.country) conditions.push(eq(giveawayAuditEvents.country, filters.country));

  if (filters.cursor) {
    const c = filters.cursor;
    const cursorDate = new Date(c.createdAt);
    const equalDateAndOlderId = and(
      eq(giveawayAuditEvents.createdAt, cursorDate),
      lt(giveawayAuditEvents.id, c.id),
    );
    const olderDate = lt(giveawayAuditEvents.createdAt, cursorDate);
    const cursorClause = equalDateAndOlderId ? or(olderDate, equalDateAndOlderId) : olderDate;
    if (cursorClause) conditions.push(cursorClause);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: giveawayAuditEvents.id,
      createdAt: giveawayAuditEvents.createdAt,
      action: giveawayAuditEvents.action,
      outcome: giveawayAuditEvents.outcome,
      userId: giveawayAuditEvents.userId,
      userName: user.name,
      refType: giveawayAuditEvents.refType,
      refId: giveawayAuditEvents.refId,
      country: giveawayAuditEvents.country,
      ipHash: giveawayAuditEvents.ipHash,
      userAgent: giveawayAuditEvents.userAgent,
      metadata: giveawayAuditEvents.metadata,
    })
    .from(giveawayAuditEvents)
    .leftJoin(user, eq(giveawayAuditEvents.userId, user.id))
    .where(whereClause)
    .orderBy(desc(giveawayAuditEvents.createdAt), desc(giveawayAuditEvents.id))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const page = (hasMore ? rows.slice(0, pageSize) : rows).map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    action: r.action as AuditAction,
    outcome: r.outcome as AuditOutcome,
    userId: r.userId,
    userName: r.userName,
    refType: r.refType,
    refId: r.refId,
    country: r.country,
    ipHash: r.ipHash,
    userAgent: r.userAgent,
    metadata: r.metadata,
  }));

  const lastRow = page.length > 0 ? page[page.length - 1] : null;
  const nextCursor = hasMore && lastRow
    ? { createdAt: lastRow.createdAt.toISOString(), id: lastRow.id }
    : null;

  return { rows: page, nextCursor };
}

/**
 * Devuelve counters por `action` para el rango de fechas dado. Útil para
 * el sumario de la vista admin. No filtra por `action`/`outcome` para dar
 * visión global.
 */
export async function countAuditEventsByAction(range: { from?: Date | null; to?: Date | null } = {}): Promise<Record<string, number>> {
  const conditions = [] as ReturnType<typeof eq>[];
  if (range.from) conditions.push(gte(giveawayAuditEvents.createdAt, range.from));
  if (range.to) conditions.push(lte(giveawayAuditEvents.createdAt, range.to));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      action: giveawayAuditEvents.action,
      count: sql<number>`count(*)::int`,
    })
    .from(giveawayAuditEvents)
    .where(whereClause)
    .groupBy(giveawayAuditEvents.action);

  return Object.fromEntries(rows.map((r) => [r.action, r.count]));
}

function clampPageSize(input: number | undefined): number {
  if (!input || !Number.isFinite(input)) return AUDIT_DEFAULT_PAGE_SIZE;
  const n = Math.floor(input);
  if (n < 1) return AUDIT_DEFAULT_PAGE_SIZE;
  if (n > AUDIT_MAX_PAGE_SIZE) return AUDIT_MAX_PAGE_SIZE;
  return n;
}

export function isValidAuditAction(value: string | null | undefined): value is AuditAction {
  if (!value) return false;
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function isValidAuditOutcome(value: string | null | undefined): value is AuditOutcome {
  if (!value) return false;
  return (AUDIT_OUTCOMES as readonly string[]).includes(value);
}
