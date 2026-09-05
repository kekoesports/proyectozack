import { createHash } from 'node:crypto';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { automationRegistry, creatorDigestOutbox } from '@/db/schema';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { creatorDigestAckSchema, creatorDigestEventKeySchema } from '@/lib/schemas/creator-digest';

export async function enqueueCreatorDigest(eventKey: string, content: string, runId?: number): Promise<boolean> {
  if (!creatorDigestEventKeySchema.safeParse(eventKey).success || !content.trim() || content.length > 1800) throw new Error('creator_digest_invalid');
  const guildId = env.DISCORD_CREATOR_DISCOVERY_GUILD_ID, channelId = env.DISCORD_CREATOR_DISCOVERY_CHANNEL_ID;
  if (!guildId || !channelId) return false;
  await db.insert(creatorDigestOutbox).values({ eventKey, runId, content, channelId, guildId,
    nonce: createHash('sha256').update(eventKey).digest('hex').slice(0, 24) })
    .onConflictDoNothing({ target: creatorDigestOutbox.eventKey });
  return true;
}

export async function listPendingCreatorDigests(since?: Date) {
  return db.select({ id: creatorDigestOutbox.id, eventKey: creatorDigestOutbox.eventKey,
    createdAt: creatorDigestOutbox.createdAt, guildId: creatorDigestOutbox.guildId,
    channelId: creatorDigestOutbox.channelId, message: creatorDigestOutbox.content }).from(creatorDigestOutbox)
    .where(and(eq(creatorDigestOutbox.status, 'pending'), lte(creatorDigestOutbox.availableAt, new Date()),
      since ? gte(creatorDigestOutbox.createdAt, since) : undefined))
    .orderBy(asc(creatorDigestOutbox.id)).limit(20);
}

export async function acknowledgeCreatorDigest(id: number, input: unknown): Promise<'acknowledged' | 'duplicate' | 'not_found' | 'conflict'> {
  const parsed = creatorDigestAckSchema.safeParse(input);
  if (!parsed.success) return 'conflict';
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(creatorDigestOutbox).where(eq(creatorDigestOutbox.id, id)).for('update');
    if (!row) return 'not_found';
    if (row.guildId !== env.DISCORD_CREATOR_DISCOVERY_GUILD_ID || row.channelId !== env.DISCORD_CREATOR_DISCOVERY_CHANNEL_ID
      || row.channelId !== parsed.data.channelId) return 'conflict';
    if (row.status === 'sent') return row.messageId === parsed.data.messageId ? 'duplicate' : 'conflict';
    if (row.status !== 'pending') return 'conflict';
    const now = new Date();
    await tx.update(creatorDigestOutbox).set({ status: 'sent', messageId: parsed.data.messageId, sentAt: now,
      updatedAt: now, attempts: row.attempts + 1 }).where(eq(creatorDigestOutbox.id, id));
    await tx.insert(automationRegistry).values({ key: 'creator:digest', name: 'Creator Discovery — Discord digest',
      type: 'reporting', purpose: 'Resumen interno de descubrimiento; sin contactar creadores.', enabled: true,
      status: 'HEALTHY', lastSuccessAt: now, version: 'creator-discovery-1', evidence: `Discord ACK ${parsed.data.messageId}`, observedAt: now })
      .onConflictDoUpdate({ target: automationRegistry.key, set: { status: 'HEALTHY', lastSuccessAt: now,
        lastError: null, evidence: `Discord ACK ${parsed.data.messageId}`, observedAt: now, updatedAt: now } });
    return 'acknowledged';
  });
}
