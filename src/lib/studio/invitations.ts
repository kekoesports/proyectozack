import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { studioInvitations, talentUsers } from '@/db/schema/studio';
import { user } from '@/db/schema/auth';
import type { StudioDatabase } from './repository';

export const invitationHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export async function issueStudioInvitation(
  database: StudioDatabase,
  talentId: number,
  email: string,
  invitedBy: string,
) {
  const token = randomBytes(32).toString('hex');
  await database
    .insert(studioInvitations)
    .values({
      talentId,
      email: email.trim().toLowerCase(),
      invitedBy,
      tokenHash: invitationHash(token),
      expiresAt: new Date(Date.now() + 48 * 3600_000),
    });
  return token;
}

export async function acceptStudioInvitation(
  database: StudioDatabase,
  token: string,
  userId: string,
  email: string,
) {
  return database.transaction(async (tx) => {
    // Lock user first: two concurrent invites cannot assign two different talents.
    const [person] = await tx
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .for('update');
    if (
      !person ||
      !person.emailVerified ||
      person.email.toLowerCase() !== email.toLowerCase()
    )
      return false;
    const [invite] = await tx
      .select()
      .from(studioInvitations)
      .where(
        and(
          eq(studioInvitations.tokenHash, invitationHash(token)),
          eq(studioInvitations.email, email.trim().toLowerCase()),
          isNull(studioInvitations.acceptedAt),
          isNull(studioInvitations.revokedAt),
          gt(studioInvitations.expiresAt, new Date()),
        ),
      )
      .for('update');
    if (!invite) return false;
    const [existing] = await tx
      .select()
      .from(talentUsers)
      .where(eq(talentUsers.userId, userId));
    // Revoked membership is not silently restored by an old invitation.
    if (existing) return false;
    await tx
      .insert(talentUsers)
      .values({
        talentId: invite.talentId,
        userId,
        invitedBy: invite.invitedBy,
      });
    await tx
      .update(studioInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(studioInvitations.id, invite.id));
    if (person.role === null)
      await tx.update(user).set({ role: 'creator' }).where(eq(user.id, userId));
    return true;
  });
}
