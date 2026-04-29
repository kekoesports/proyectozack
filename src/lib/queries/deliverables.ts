import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deliverables, deliverableComments } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { ALLOWED_TRANSITIONS } from '@/lib/schemas/deliverable';
import type { DeliverableStatus } from '@/lib/schemas/deliverable';

export type Deliverable = InferSelectModel<typeof deliverables>;
export type DeliverableComment = InferSelectModel<typeof deliverableComments>;

export type DeliverableWithComments = Deliverable & {
  comments: DeliverableComment[];
};

/**
 * Lista todos los deliverables de una campaña con sus comentarios.
 *
 * @cache none
 * @visibility admin
 * @returns array (puede ser vacío). Nunca null.
 */
export async function listDeliverablesByCampaign(
  campaignId: number,
): Promise<DeliverableWithComments[]> {
  const rows = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.campaignId, campaignId))
    .orderBy(desc(deliverables.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const allComments = await db
    .select()
    .from(deliverableComments)
    .where(inArray(deliverableComments.deliverableId, ids))
    .orderBy(deliverableComments.createdAt);

  const commentsByDeliverable = new Map<number, DeliverableComment[]>();
  for (const c of allComments) {
    const existing = commentsByDeliverable.get(c.deliverableId) ?? [];
    existing.push(c);
    commentsByDeliverable.set(c.deliverableId, existing);
  }

  return rows.map((r) => ({
    ...r,
    comments: commentsByDeliverable.get(r.id) ?? [],
  }));
}

/**
 * Obtiene un deliverable por id.
 *
 * @cache none
 * @visibility admin
 * @returns Deliverable | undefined (nunca null).
 */
export async function getDeliverable(id: number): Promise<Deliverable | undefined> {
  const [row] = await db.select().from(deliverables).where(eq(deliverables.id, id)).limit(1);
  return row ?? undefined;
}

/**
 * Crea un nuevo deliverable para una campaña.
 *
 * @cache none
 * @visibility admin
 * @returns el deliverable creado.
 */
export async function createDeliverable(data: {
  campaignId: number;
  talentId: number;
  title: string;
  type: Deliverable['type'];
  description?: string;
  dueDate?: string;
  contentUrl?: string;
}): Promise<Deliverable> {
  const [row] = await db
    .insert(deliverables)
    .values({
      campaignId: data.campaignId,
      talentId: data.talentId,
      title: data.title,
      type: data.type,
      description: data.description ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contentUrl: data.contentUrl ?? null,
      status: 'pending_submission',
    })
    .returning();
  return row!;
}

/**
 * Actualiza el estado de un deliverable con validación de transición.
 * Añade un comentario al audit trail si se provee.
 *
 * @cache none
 * @visibility admin
 * @returns el deliverable actualizado o null si la transición es inválida.
 */
export async function transitionDeliverableStatus(
  deliverableId: number,
  nextStatus: DeliverableStatus,
  opts: {
    userId?: string;
    comment?: string;
    contentUrl?: string;
    revisionNotes?: string;
  } = {},
): Promise<Deliverable | null> {
  const existing = await getDeliverable(deliverableId);
  if (!existing) return null;

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(nextStatus)) return null;

  const now = new Date();
  const patch: Partial<typeof deliverables.$inferInsert> = {
    status: nextStatus,
    updatedAt: now,
  };

  if (nextStatus === 'submitted') {
    patch.submittedAt = now;
    patch.submittedByUserId = opts.userId ?? null;
    if (opts.contentUrl) patch.contentUrl = opts.contentUrl;
  }

  if (nextStatus === 'approved') {
    patch.approvedAt = now;
    patch.reviewedAt = now;
    patch.reviewedByUserId = opts.userId ?? null;
  }

  if (nextStatus === 'internal_review' || nextStatus === 'brand_review') {
    patch.reviewedAt = now;
    patch.reviewedByUserId = opts.userId ?? null;
  }

  if (nextStatus === 'revision_requested' && opts.revisionNotes) {
    patch.revisionNotes = opts.revisionNotes;
  }

  const [updated] = await db
    .update(deliverables)
    .set(patch)
    .where(eq(deliverables.id, deliverableId))
    .returning();

  if (!updated) return null;

  // Append comment to audit trail if provided
  const commentText = opts.comment?.trim();
  if (commentText) {
    await db.insert(deliverableComments).values({
      deliverableId,
      authorUserId: opts.userId ?? null,
      content: commentText,
      statusSnapshot: nextStatus,
    });
  }

  return updated;
}

/**
 * Elimina un deliverable (solo si está en pending_submission — no aprobado).
 *
 * @cache none
 * @visibility admin
 */
export async function deleteDeliverable(id: number): Promise<boolean> {
  const existing = await getDeliverable(id);
  if (!existing) return false;
  if (existing.status === 'approved') return false; // can't delete approved deliverables

  await db.delete(deliverables).where(eq(deliverables.id, id));
  return true;
}
