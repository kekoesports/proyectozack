import 'server-only';

import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { talentBusiness } from '@/db/schema/talentBusiness';
import { talents } from '@/db/schema/talents';
import { sendDealTrackingReminderEmail } from '@/lib/email/dealTrackingReminder';
import { db } from '@/lib/db';

const DAY_MS = 86_400_000;
const STALE_AFTER_DAYS = 7;
const RETRY_AFTER_MS = DAY_MS;
const ACTIVE_STATUSES = ['propuesta', 'negociacion', 'aprobada', 'activa', 'pendiente_pago'] as const;

export type TrackingReminderNotification = {
  readonly campaignId: number;
  readonly campaignName: string;
  readonly talentName: string;
  readonly brandName: string;
  readonly trackingSheetUrl: string;
  readonly inactiveDays: number;
  readonly baselineAt: string;
  readonly emailStatus: 'sent' | 'missing-recipient' | 'send-failed';
};

export async function processStaleDealTrackingReminders(
  now = new Date(),
): Promise<readonly TrackingReminderNotification[]> {
  const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * DAY_MS);
  const rows = await db
    .select({
      campaignId: campaigns.id,
      campaignName: campaigns.name,
      brandName: crmBrands.name,
      talentName: talents.name,
      trackingSheetUrl: campaigns.trackingSheetUrl,
      createdAt: campaigns.createdAt,
      lastEvidenceAddedAt: campaigns.lastEvidenceAddedAt,
      reminderBaselineAt: campaigns.trackingReminderBaselineAt,
      reminderAttemptAt: campaigns.trackingReminderAttemptAt,
      reminderEmailSentAt: campaigns.trackingReminderEmailSentAt,
      reminderDiscordNotifiedAt: campaigns.trackingReminderDiscordNotifiedAt,
      reminderError: campaigns.trackingReminderError,
      contactEmail: talentBusiness.contactEmail,
      managerEmail: talentBusiness.managerEmail,
    })
    .from(campaigns)
    .innerJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .innerJoin(talents, eq(campaigns.talentId, talents.id))
    .leftJoin(talentBusiness, eq(campaigns.talentId, talentBusiness.talentId))
    .where(and(
      inArray(campaigns.status, [...ACTIVE_STATUSES]),
      isNull(campaigns.archivedAt),
      isNotNull(campaigns.trackingSheetUrl),
      isNull(campaigns.trackingSyncError),
      sql`COALESCE(${campaigns.lastEvidenceAddedAt}, ${campaigns.createdAt}) <= ${cutoff}`,
      // No reclamar actualizaciones si el trato no tiene objetivos definidos
      // o ya está completo. Ambos casos requieren revisión interna, no email.
      sql`EXISTS (
        SELECT 1
        FROM ${dealDeliverableTrackers} reminder_tracker
        WHERE reminder_tracker.campaign_id = ${campaigns.id}
          AND reminder_tracker.status <> 'cancelled'
          AND reminder_tracker.target_count > 0
          AND reminder_tracker.current_count < reminder_tracker.target_count
      )`,
    ));

  const notifications: TrackingReminderNotification[] = [];
  for (const row of rows) {
    if (!row.trackingSheetUrl) continue;
    const baseline = row.lastEvidenceAddedAt ?? row.createdAt;
    const sameBaseline = sameInstant(row.reminderBaselineAt, baseline);
    const previouslySent = sameBaseline && row.reminderEmailSentAt !== null;
    const retryDue = !row.reminderAttemptAt
      || now.getTime() - row.reminderAttemptAt.getTime() >= RETRY_AFTER_MS;
    const shouldAttempt = !sameBaseline || (!previouslySent && retryDue);
    const recipient = row.contactEmail ?? row.managerEmail;

    let emailStatus: TrackingReminderNotification['emailStatus'] = previouslySent
      ? 'sent'
      : statusFromError(row.reminderError);
    let resetDiscord = !sameBaseline;

    if (shouldAttempt) {
      let emailSentAt: Date | null = previouslySent ? row.reminderEmailSentAt : null;
      let reminderError: string | null = null;
      if (!recipient) {
        emailStatus = 'missing-recipient';
        reminderError = 'missing-recipient';
      } else {
        try {
          await sendDealTrackingReminderEmail({
            to: recipient,
            talentName: row.talentName,
            brandName: row.brandName,
            trackingSheetUrl: row.trackingSheetUrl,
            inactiveDays: inactiveDays(now, baseline),
            idempotencyKey: `deal-tracking-${row.campaignId}-${baseline.getTime()}`,
          });
          emailStatus = 'sent';
          emailSentAt = now;
          resetDiscord = true;
        } catch {
          emailStatus = 'send-failed';
          reminderError = 'send-failed';
        }
      }

      await db
        .update(campaigns)
        .set({
          trackingReminderBaselineAt: baseline,
          trackingReminderAttemptAt: now,
          trackingReminderEmailSentAt: emailSentAt,
          trackingReminderDiscordNotifiedAt: resetDiscord
            ? null
            : row.reminderDiscordNotifiedAt,
          trackingReminderError: reminderError,
          updatedAt: now,
        })
        .where(eq(campaigns.id, row.campaignId));
    }

    const discordAlreadySent = !resetDiscord && row.reminderDiscordNotifiedAt !== null;
    if (!discordAlreadySent) {
      notifications.push({
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        talentName: row.talentName,
        brandName: row.brandName,
        trackingSheetUrl: row.trackingSheetUrl,
        inactiveDays: inactiveDays(now, baseline),
        baselineAt: baseline.toISOString(),
        emailStatus,
      });
    }
  }
  return notifications;
}

export async function acknowledgeTrackingReminder(
  campaignId: number,
  baselineAt: Date,
): Promise<boolean> {
  const [updated] = await db
    .update(campaigns)
    .set({ trackingReminderDiscordNotifiedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(campaigns.id, campaignId),
      eq(campaigns.trackingReminderBaselineAt, baselineAt),
    ))
    .returning({ id: campaigns.id });
  return updated !== undefined;
}

export function formatTrackingReminderForDiscord(
  reminder: TrackingReminderNotification,
): string {
  const title = `**${safe(reminder.talentName)} × ${safe(reminder.brandName)}**`;
  const crm = `https://socialpro.es/admin/campanas/${reminder.campaignId}`;
  if (reminder.emailStatus === 'sent') {
    return [
      '## 📨 RECORDATORIO DE SEGUIMIENTO ENVIADO',
      `${title} · **${reminder.inactiveDays} días sin contenido nuevo**`,
      `📄 ${reminder.trackingSheetUrl}`,
      `🔗 ${crm}`,
    ].join('\n');
  }
  const reason = reminder.emailStatus === 'missing-recipient'
    ? 'el creador no tiene email de contacto configurado'
    : 'el proveedor de correo no aceptó el envío; se reintentará en 24 horas';
  return [
    '## ⚠️ RECORDATORIO DE SEGUIMIENTO PENDIENTE',
    `${title} · **${reminder.inactiveDays} días sin contenido nuevo**`,
    `Motivo: ${reason}.`,
    `📄 ${reminder.trackingSheetUrl}`,
    `🔗 ${crm}`,
  ].join('\n');
}

function inactiveDays(now: Date, baseline: Date): number {
  return Math.max(0, Math.floor((now.getTime() - baseline.getTime()) / DAY_MS));
}

function sameInstant(left: Date | null, right: Date): boolean {
  return left?.getTime() === right.getTime();
}

function statusFromError(error: string | null): TrackingReminderNotification['emailStatus'] {
  return error === 'missing-recipient' ? 'missing-recipient' : 'send-failed';
}

function safe(value: string): string {
  return value.replace(/@/g, '@\u200b').replace(/[\r\n]+/g, ' ').slice(0, 140);
}
