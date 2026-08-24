import 'server-only';

import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';

import { automationDealDrafts } from '@/db/schema/automationDealDrafts';
import { campaigns } from '@/db/schema/campaigns';
import { db } from '@/lib/db';

export type DiscordDealCreatedNotification = {
  readonly draftId: number;
  readonly campaignId: number;
  readonly channelId: string;
  readonly dealName: string;
  readonly documentUrl: string;
  readonly sharedWithInfluencer: boolean;
  readonly message: string;
};

function escapeDiscordText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replace(/([*_~`|>])/g, '\\$1')
    .replaceAll('@', '@\u200b');
}

export function formatDiscordDealCreatedMessage(input: {
  readonly dealName: string;
  readonly documentUrl: string;
  readonly sharedWithInfluencer: boolean;
}): string {
  const shared = input.sharedWithInfluencer ? 'SÍ' : 'NO';
  return [
    '## ✅ TRATO CREADO CORRECTAMENTE',
    `**${escapeDiscordText(input.dealName)}**`,
    `👤 Compartido con el influencer: **${shared}**`,
    `📄 **[AQUÍ TIENES EL DOCUMENTO](${input.documentUrl})**`,
  ].join('\n');
}

/**
 * Devuelve confirmaciones pendientes sin marcarlas como enviadas.
 * n8n hace el ACK únicamente después de que Discord acepte el mensaje.
 */
export async function listPendingDiscordDealCreatedNotifications(
  limit = 25,
): Promise<readonly DiscordDealCreatedNotification[]> {
  const rows = await db
    .select({
      draftId: automationDealDrafts.id,
      campaignId: automationDealDrafts.campaignId,
      channelId: automationDealDrafts.sourceChannelId,
      sheetShareStatus: automationDealDrafts.sheetShareStatus,
      dealName: campaigns.name,
      documentUrl: campaigns.trackingSheetUrl,
    })
    .from(automationDealDrafts)
    .innerJoin(campaigns, eq(automationDealDrafts.campaignId, campaigns.id))
    .where(and(
      eq(automationDealDrafts.source, 'discord'),
      eq(automationDealDrafts.status, 'created'),
      isNotNull(automationDealDrafts.campaignId),
      isNotNull(automationDealDrafts.sourceChannelId),
      isNull(automationDealDrafts.discordNotifiedAt),
      isNotNull(campaigns.trackingSheetUrl),
    ))
    .orderBy(asc(automationDealDrafts.reviewedAt))
    .limit(Math.max(1, Math.min(100, Math.trunc(limit))));

  return rows.flatMap((row) => {
    if (row.campaignId === null || row.channelId === null || row.documentUrl === null) return [];
    // Un estado antiguo o interrumpido puede no haber persistido el resultado
    // de compartición. Eso no debe bloquear el aviso: null se comunica como NO
    // y una nueva aprobación lo repara a `not-requested` de forma idempotente.
    const sharedWithInfluencer = row.sheetShareStatus === 'shared';
    return [{
      draftId: row.draftId,
      campaignId: row.campaignId,
      channelId: row.channelId,
      dealName: row.dealName,
      documentUrl: row.documentUrl,
      sharedWithInfluencer,
      message: formatDiscordDealCreatedMessage({
        dealName: row.dealName,
        documentUrl: row.documentUrl,
        sharedWithInfluencer,
      }),
    }];
  });
}

export type DiscordDealNotificationAck = 'acknowledged' | 'already_acknowledged' | 'not_found';

export async function acknowledgeDiscordDealCreatedNotification(
  draftId: number,
): Promise<DiscordDealNotificationAck> {
  const [updated] = await db
    .update(automationDealDrafts)
    .set({ discordNotifiedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(automationDealDrafts.id, draftId),
      eq(automationDealDrafts.source, 'discord'),
      eq(automationDealDrafts.status, 'created'),
      isNull(automationDealDrafts.discordNotifiedAt),
    ))
    .returning({ id: automationDealDrafts.id });
  if (updated) return 'acknowledged';

  const [existing] = await db
    .select({ discordNotifiedAt: automationDealDrafts.discordNotifiedAt })
    .from(automationDealDrafts)
    .where(and(
      eq(automationDealDrafts.id, draftId),
      eq(automationDealDrafts.source, 'discord'),
      eq(automationDealDrafts.status, 'created'),
    ))
    .limit(1);
  return existing?.discordNotifiedAt ? 'already_acknowledged' : 'not_found';
}
