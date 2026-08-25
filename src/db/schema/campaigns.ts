import { sql } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  index,
  uniqueIndex,
  check,
  boolean,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { crmBrands, crmBrandContacts } from './crmBrands';
import { talents } from './talents';

export const campaignStatusEnum = pgEnum('campaign_status', [
  'propuesta', 'negociacion', 'aprobada', 'activa',
  'completada', 'cancelada', 'pendiente_pago', 'pagada',
]);

export const campaignActionTypeEnum = pgEnum('campaign_action_type', [
  'stream', 'preroll', 'video_youtube', 'short_reel_tiktok', 'tweet',
  'story_instagram', 'pack_mensual', 'afiliacion', 'otro',
]);

export const campaignPaymentMethodEnum = pgEnum('campaign_payment_method', [
  'banco', 'crypto', 'banco_agencia', 'banco_stark',
  'crypto_agencia', 'crypto_zack', 'otro',
]);

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),

  brandId: integer('brand_id').notNull().references(() => crmBrands.id, { onDelete: 'restrict' }),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'restrict' }),
  brandContactId: integer('brand_contact_id').references(() => crmBrandContacts.id, { onDelete: 'set null' }),

  responsibleUserId: text('responsible_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  assignedToUserId: text('assigned_to_user_id').references(() => user.id, { onDelete: 'set null' }),

  sector: varchar('sector', { length: 40 }),
  geo: varchar('geo', { length: 20 }),
  actionType: campaignActionTypeEnum('action_type').notNull(),
  status: campaignStatusEnum('status').notNull().default('propuesta'),

  startDate: date('start_date'),
  endDate: date('end_date'),
  deliveryDeadline: date('delivery_deadline'),

  briefingUrl: text('briefing_url'),
  contentUrl: text('content_url'),
  notes: text('notes'),
  creatorNotes: text('creator_notes'),

  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  amountBrand: numeric('amount_brand', { precision: 12, scale: 2 }).notNull().default('0'),
  amountTalent: numeric('amount_talent', { precision: 12, scale: 2 }).notNull().default('0'),

  amountInKindTalent: numeric('amount_in_kind_talent', { precision: 12, scale: 2 }),
  amountInKindCommunity: numeric('amount_in_kind_community', { precision: 12, scale: 2 }),

  estimatedCostAgency: numeric('estimated_cost_agency', { precision: 12, scale: 2 }),
  estimatedMarginPct: numeric('estimated_margin_pct', { precision: 5, scale: 2 }),
  cnmcChecklistOk: boolean('cnmc_checklist_ok').notNull().default(false),
  cnmcChecklistAt: timestamp('cnmc_checklist_at', { withTimezone: true }),
  cnmcChecklistUserId: text('cnmc_checklist_user_id'),

  brandPaymentMethod: campaignPaymentMethodEnum('brand_payment_method'),
  talentPaymentMethod: campaignPaymentMethodEnum('talent_payment_method'),

  cobroConfirmado: boolean('cobro_confirmado').notNull().default(false),
  pagoTalentConfirmado: boolean('pago_talent_confirmado').notNull().default(false),

  visibility: varchar('visibility', { length: 10 }).notNull().default('team'),

  // ── Tracking Sheet (PR2: tratos link Google Sheet) ────────────────────────
  // Link canónico a un Google Sheet duplicado manualmente o por n8n a partir
  // de la plantilla de la marca. El parser socialpro_blocks
  // lee este Sheet para calcular currentCount de dealDeliverableTrackers.
  // Se lee con la cuenta de servicio si la hoja es privada; la API key queda
  // como fallback compatible para trackers públicos históricos.
  trackingSheetUrl:            text('tracking_sheet_url'),
  trackingSheetSpreadsheetId:  varchar('tracking_sheet_spreadsheet_id', { length: 100 }),
  trackingSheetGid:            varchar('tracking_sheet_gid', { length: 20 }),
  lastTrackingSyncAt:          timestamp('last_tracking_sync_at', { withTimezone: true }),
  // Última evidencia HTTP(S) nueva detectada en la Sheet. A diferencia de
  // updatedAt/lastTrackingSyncAt, solo cambia cuando aparece un enlace nuevo.
  lastEvidenceAddedAt:         timestamp('last_evidence_added_at', { withTimezone: true }),
  trackingSyncError:           text('tracking_sync_error'),
  trackingAlertLevel:          integer('tracking_alert_level').notNull().default(0),
  // Recordatorio de inactividad al creador. El baseline identifica el último
  // avance real para que un reintento de Discord no duplique el email.
  trackingReminderBaselineAt:          timestamp('tracking_reminder_baseline_at', { withTimezone: true }),
  trackingReminderAttemptAt:           timestamp('tracking_reminder_attempt_at', { withTimezone: true }),
  trackingReminderEmailSentAt:         timestamp('tracking_reminder_email_sent_at', { withTimezone: true }),
  trackingReminderDiscordNotifiedAt:   timestamp('tracking_reminder_discord_notified_at', { withTimezone: true }),
  trackingReminderError:               text('tracking_reminder_error'),

  // Identidad estable del sistema que originó el trato. Permite que n8n
  // reintente una ejecución sin crear campañas duplicadas.
  automationSource: varchar('automation_source', { length: 40 }),
  automationExternalId: varchar('automation_external_id', { length: 160 }),

  archivedAt: timestamp('archived_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('campaigns_brand_idx').on(t.brandId),
  index('campaigns_talent_idx').on(t.talentId),
  index('campaigns_status_idx').on(t.status),
  index('campaigns_assigned_idx').on(t.assignedToUserId),
  index('campaigns_responsible_idx').on(t.responsibleUserId),
  index('campaigns_created_by_idx').on(t.createdByUserId),
  index('campaigns_start_idx').on(t.startDate),
  index('campaigns_action_idx').on(t.actionType),
  index('campaigns_archived_idx').on(t.archivedAt),
  index('campaigns_last_evidence_idx').on(t.lastEvidenceAddedAt),
  index('campaigns_tracking_reminder_idx').on(t.trackingReminderBaselineAt, t.trackingReminderDiscordNotifiedAt),
  uniqueIndex('campaigns_automation_source_external_uq')
    .on(t.automationSource, t.automationExternalId)
    .where(sql`automation_source IS NOT NULL AND automation_external_id IS NOT NULL`),
  check('campaigns_tracking_alert_level_check', sql`${t.trackingAlertLevel} IN (0, 70, 80, 100)`),
]);
