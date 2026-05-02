import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pressTargets } from '@/db/schema';
import type { PressTarget, PressTargetOutreachStatus } from '@/types';

/**
 * @cache none
 * @visibility admin + staff
 */
export async function getAllPressTargets(): Promise<PressTarget[]> {
  return db.select().from(pressTargets).orderBy(desc(pressTargets.updatedAt));
}

/**
 * Solo `contactado` toca `lastContactedAt`/`assignedToUserId`. `respondido` es la respuesta de ellos
 * — no resetear el timestamp. `publicado`/`descartado` son terminales y no tocan contacto.
 *
 * @cache none
 * @visibility admin + staff
 */
export async function updatePressTargetOutreachStatus(
  id: number,
  status: PressTargetOutreachStatus,
  userId: string,
): Promise<void> {
  const now = new Date();
  const touchesContact = status === 'contactado';
  await db
    .update(pressTargets)
    .set({
      outreachStatus: status,
      assignedToUserId: touchesContact ? userId : undefined,
      lastContactedAt: touchesContact ? now : undefined,
      updatedAt: now,
    })
    .where(eq(pressTargets.id, id));
}

/**
 * @cache none
 * @visibility admin + staff
 */
export async function updatePressTargetNotes(id: number, notes: string): Promise<void> {
  await db
    .update(pressTargets)
    .set({ notes, updatedAt: new Date() })
    .where(eq(pressTargets.id, id));
}
