import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { creatorFeedback, targets } from '@/db/schema';
import { db } from '@/lib/db';
import type { Target } from '@/types';

/** Legacy/manual actions lack an evidence-specific reason: never infer eligibility from them. */
export async function recordTargetStatusHistory(options: Readonly<{
  ids?: number[];
  status: Target['status'];
  actorId?: string;
  brandUserId?: string;
  explicitArchive?: boolean;
}>): Promise<void> {
  if (options.ids?.length === 0) return;
  await db.transaction(async (tx) => {
    const explicitArchive = options.explicitArchive === true && options.status === 'descartado';
    const conditions = explicitArchive ? [] : [ne(targets.status, options.status)];
    if (options.ids) conditions.push(inArray(targets.id, options.ids));
    if (options.brandUserId) conditions.push(eq(targets.brandUserId, options.brandUserId));
    const rows = await tx.select({ id: targets.id, status: targets.status }).from(targets)
      .where(and(...conditions)).orderBy(asc(targets.id)).for('update');
    if (rows.length === 0) return;
    const changes: typeof rows = [];
    for (const row of rows) {
      if (explicitArchive && row.status === 'descartado') {
        // Archiving an already discarded row is a new manual suppression decision,
        // unless the latest decision already records that same intention. The row lock serializes retries.
        const [last] = await tx.select().from(creatorFeedback).where(eq(creatorFeedback.targetId, row.id))
          .orderBy(desc(creatorFeedback.id)).limit(1);
        if (last?.status === 'descartado' && last.reason === 'other') continue;
      }
      changes.push(row);
    }
    if (changes.length === 0) return;
    const now = new Date();
    await tx.insert(creatorFeedback).values(changes.map(row => ({ targetId: row.id,
      actorId: options.actorId ?? null, previousStatus: row.status, status: options.status,
      reason: options.status === 'pendiente' ? 'reopened' : options.status === 'contactado' ? 'contacted'
        : options.status === 'finalizado' ? 'agreement_completed' : 'other',
      note: options.status === 'descartado' ? 'Archivado recuperable manual. Sin motivo de rendimiento verificado; no reabrir automáticamente.' : null,
      createdAt: now,
    })));
    await tx.update(targets).set({ status: options.status, updatedAt: now,
      contactedAt: options.status === 'contactado' ? now : undefined }).where(inArray(targets.id, changes.map(row => row.id)));
  });
}
