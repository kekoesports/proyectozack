import { and, count, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { newsAlerts } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type NewsAlert = InferSelectModel<typeof newsAlerts>;
export type NewsAlertCategory = 'regulatory' | 'competitor' | 'brand' | 'sector' | 'own';

/** Cuenta alertas no leídas y no archivadas — para badge en dashboard. */
export async function getUnreadNewsAlertsCount(): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(newsAlerts)
    .where(and(isNull(newsAlerts.readAt), isNull(newsAlerts.dismissedAt)));
  return row?.count ?? 0;
}

/** Últimas N alertas no archivadas — para widget de dashboard. */
export async function getRecentNewsAlerts(limit = 5): Promise<NewsAlert[]> {
  return db
    .select()
    .from(newsAlerts)
    .where(isNull(newsAlerts.dismissedAt))
    .orderBy(desc(newsAlerts.publishedAt))
    .limit(limit);
}

type ListOptions = {
  category?: NewsAlertCategory | 'all';
  onlyUnread?: boolean;
  onlyDismissed?: boolean;
  limit?: number;
  offset?: number;
};

/** Lista alertas con filtros — para página /admin/alertas. */
export async function getNewsAlerts({
  category = 'all',
  onlyUnread = false,
  onlyDismissed = false,
  limit = 50,
  offset = 0,
}: ListOptions = {}): Promise<NewsAlert[]> {
  const conditions = [];

  if (category !== 'all') conditions.push(eq(newsAlerts.category, category));

  if (onlyDismissed) {
    // solo archivadas
  } else if (onlyUnread) {
    conditions.push(isNull(newsAlerts.readAt), isNull(newsAlerts.dismissedAt));
  } else {
    // vista normal: activas (no archivadas)
    conditions.push(isNull(newsAlerts.dismissedAt));
  }

  return db
    .select()
    .from(newsAlerts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(newsAlerts.publishedAt))
    .limit(limit)
    .offset(offset);
}

/** Elimina alertas antiguas según política de retención. */
export async function cleanupOldNewsAlerts(): Promise<{ deleted: number }> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(newsAlerts)
    .where(
      or(
        // Leídas hace más de 90 días
        and(isNull(newsAlerts.dismissedAt), lt(newsAlerts.syncedAt, ninetyDaysAgo)),
        // Archivadas hace más de 30 días
        lt(newsAlerts.dismissedAt, thirtyDaysAgo),
      ),
    );

  return { deleted: result.rowCount ?? 0 };
}
