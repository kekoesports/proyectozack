import { and, eq, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { campaigns, crmBrands, talents, user } from '@/db/schema';
import { quickNotes, quickNoteShares } from '@/db/schema/quickNotes';
import type { db } from '@/lib/db';
import type { NoteActor, NoteRelation } from '@/lib/schemas/quickNote';
import type { z } from 'zod';
import { canUseQuickNotes } from './access';

export type NoteDatabase = typeof db;
export type NoteTransaction = Parameters<
  Parameters<NoteDatabase['transaction']>[0]
>[0];
export function noteError(
  message: string,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST' = 'BAD_REQUEST',
): never {
  throw new TRPCError({ code, message });
}
export function assertNotes(actor: NoteActor): void {
  if (!canUseQuickNotes(actor.role))
    noteError('No tienes acceso a las notas.', 'FORBIDDEN');
}
export async function accessibleNote(
  tx: NoteTransaction,
  actor: NoteActor,
  id: string,
  write = false,
) {
  assertNotes(actor);
  const [note] = await tx
    .select()
    .from(quickNotes)
    .where(eq(quickNotes.id, id))
    .for('update');
  if (!note) noteError('Nota no encontrada.', 'NOT_FOUND');
  if (note.ownerId !== actor.userId) {
    if (write)
      noteError('Solo el autor puede modificar esta nota.', 'FORBIDDEN');
    const [shared] = await tx
      .select()
      .from(quickNoteShares)
      .where(
        and(
          eq(quickNoteShares.noteId, id),
          eq(quickNoteShares.userId, actor.userId),
        ),
      );
    if (!shared) noteError('Nota no encontrada.', 'NOT_FOUND');
  }
  return note;
}
export async function noteUsers(
  database: NoteDatabase | NoteTransaction,
  actor: NoteActor,
) {
  assertNotes(actor);
  const rows = await database
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user);
  return rows.filter(
    (u) =>
      ['admin', 'admin_limited_tasks', 'manager', 'staff'].includes(
        u.role ?? '',
      ) || u.id === actor.userId,
  );
}
/** Same module/ownership scope as campaign, brand and talent detail pages. */
export async function accessibleRelation(
  database: NoteDatabase | NoteTransaction,
  actor: NoteActor,
  relation: z.infer<typeof NoteRelation> | null,
) {
  if (!relation) return null;
  const staff = actor.role === 'staff';
  const campaignRoles = [
    'admin',
    'admin_limited_tasks',
    'manager',
    'staff',
    'ops',
    'talent_manager',
    'finance',
  ];
  const talentRoles = [
    'admin',
    'admin_limited_tasks',
    'manager',
    'staff',
    'talent_manager',
  ];
  if (
    !(relation.type === 'talent' ? talentRoles : campaignRoles).includes(
      actor.role,
    )
  )
    noteError('No puedes vincular esa entidad.', 'FORBIDDEN');
  if (relation.type === 'campaign') {
    const [row] = await database
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, relation.id));
    if (
      !row ||
      (staff &&
        ![
          row.assignedToUserId,
          row.createdByUserId,
          row.responsibleUserId,
        ].includes(actor.userId))
    )
      noteError('Trato no accesible.', 'FORBIDDEN');
    return { ...relation, label: row.name };
  }
  if (relation.type === 'brand') {
    const [row] = await database
      .select()
      .from(crmBrands)
      .where(eq(crmBrands.id, relation.id));
    if (
      !row ||
      (staff &&
        ![
          row.assignedToUserId,
          row.coAssignedToUserId,
          row.createdByUserId,
        ].includes(actor.userId))
    )
      noteError('Marca no accesible.', 'FORBIDDEN');
    return { ...relation, label: row.name };
  }
  const [row] = await database
    .select({ id: talents.id, name: talents.name })
    .from(talents)
    .where(eq(talents.id, relation.id));
  if (!row) noteError('Talento no accesible.', 'FORBIDDEN');
  if (staff) {
    const [link] = await database
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.talentId, relation.id),
          or(
            eq(campaigns.assignedToUserId, actor.userId),
            eq(campaigns.createdByUserId, actor.userId),
            eq(campaigns.responsibleUserId, actor.userId),
          ),
        ),
      )
      .limit(1);
    if (!link) noteError('Talento no accesible.', 'FORBIDDEN');
  }
  return { ...relation, label: row.name };
}
