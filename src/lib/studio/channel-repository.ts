import { and, desc, eq, inArray } from 'drizzle-orm';
import { studioChannels, studioChannelObservations } from '@/db/schema/studioProduction';
import { StudioObservation } from '@/lib/schemas/studio-production';
import type { StudioChannelInput } from '@/lib/schemas/studio-production';
import type { StudioDatabase } from './repository';
import { visibleStudioTalents, lockStudioMember } from './talent-scope';

export function channelUrl(platform: string, handle: string) {
  const encoded = encodeURIComponent(handle);
  switch (platform) {
    case 'instagram': return `https://www.instagram.com/${encoded}/`;
    case 'tiktok': return `https://www.tiktok.com/@${encoded}`;
    case 'youtube': return `https://www.youtube.com/@${encoded}`;
    case 'twitch': return `https://www.twitch.tv/${encoded}`;
    case 'x': return `https://x.com/${encoded}`;
    default: return null;
  }
}
export function createChannelRepository(database: StudioDatabase, userId: string, agencyTalentId?: number) {
  const owned = () => visibleStudioTalents(database, userId, agencyTalentId);
  return {
    async list() {
      const channels = await database.select().from(studioChannels).where(inArray(studioChannels.talentId, owned()));
      const observations = channels.length ? await database.select({ channelId: studioChannelObservations.channelId, document: studioChannelObservations.document })
        .from(studioChannelObservations).where(inArray(studioChannelObservations.channelId, channels.map((c) => c.id)))
        .orderBy(desc(studioChannelObservations.collectedAt)).limit(100) : [];
      return channels.map((channel) => ({ ...channel, url: channelUrl(channel.platform, channel.handle),
        observations: observations.filter((o) => o.channelId === channel.id).flatMap((o) => {
          const parsed = StudioObservation.safeParse(o.document);
          return parsed.success ? [parsed.data] : [];
        }),
      }));
    },
    async declare(input: StudioChannelInput) {
      return database.transaction(async (tx) => {
        const member = await lockStudioMember(tx, userId, agencyTalentId);
        if (!member) return false;
        const [existing] = await tx.select().from(studioChannels).where(and(eq(studioChannels.talentId, member.talentId), eq(studioChannels.platform, input.platform)));
        // A different handle invalidates all prior observations; never attach old metrics to a new account.
        if (existing && existing.handle !== input.handle) {
          await tx.delete(studioChannelObservations).where(eq(studioChannelObservations.channelId, existing.id));
          await tx.update(studioChannels).set({ handle: input.handle }).where(eq(studioChannels.id, existing.id));
        } else if (!existing) await tx.insert(studioChannels).values({ talentId: member.talentId, ...input });
        return true;
      });
    },
    async record(id: string, expectedHandle: string, document: unknown) {
      const parsed = StudioObservation.safeParse(document);
      if (!parsed.success) return false;
      return database.transaction(async (tx) => {
        const [channel] = await tx.select().from(studioChannels).where(and(eq(studioChannels.id, id),
          eq(studioChannels.handle, expectedHandle), eq(studioChannels.platform, 'youtube'), inArray(studioChannels.talentId, owned()))).for('update');
        if (!channel) return false;
        await tx.insert(studioChannelObservations).values({ channelId: id, document: parsed.data });
        return true;
      });
    },
  };
}
