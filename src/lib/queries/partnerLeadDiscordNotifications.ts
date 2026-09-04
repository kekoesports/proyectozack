import 'server-only';

import { env } from '@/lib/env';
import { formatPartnerLeadDigest } from '@/lib/partner-leads/discord';
import { listPendingPartnerLeadBatches } from '@/lib/queries/partnerLeads';

export type PartnerLeadDiscordNotification = {
  readonly batchId: number;
  readonly guildId: string;
  readonly channelId: string;
  readonly message: string;
};

export async function listPartnerLeadDiscordNotifications(): Promise<{
  readonly configured: boolean;
  readonly notifications: readonly PartnerLeadDiscordNotification[];
}> {
  const guildId = env.DISCORD_PARTNER_LEADS_GUILD_ID;
  const channelId = env.DISCORD_PARTNER_LEADS_CHANNEL_ID;
  if (!guildId || !channelId) return { configured: false, notifications: [] };

  const batches = await listPendingPartnerLeadBatches();
  return {
    configured: true,
    notifications: batches.map((batch) => ({
      batchId: batch.id,
      guildId,
      channelId,
      message: formatPartnerLeadDigest({
        researchedAt: batch.researchedAt,
        reportSummary: batch.reportSummary,
        candidates: batch.candidates,
        newLeadCount: batch.newLeadCount,
        updatedLeadCount: batch.updatedLeadCount,
        discardedCount: batch.discardedCount,
        crmUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/partner-leads?batch=${encodeURIComponent(batch.externalId)}`,
      }),
    })),
  };
}
