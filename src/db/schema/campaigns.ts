import { pgEnum, pgTable, serial, varchar, text, integer, numeric, date, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { crmBrands, crmBrandContacts } from './crmBrands';
import { talents } from './talents';

export const campaignStatusEnum = pgEnum('campaign_status', [
  'propuesta', 'negociacion', 'aprobada', 'activa',
  'completada', 'cancelada', 'pendiente_pago', 'pagada',
]);

export const campaignActionTypeEnum = pgEnum('campaign_action_type', [
  'stream', 'video_youtube', 'short_reel_tiktok', 'tweet',
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

  // "Presupuesto previsto" — pagos reales en invoices.campaignId (decisión #5)
  amountBrand: numeric('amount_brand', { precision: 12, scale: 2 }).notNull().default('0'),
  amountTalent: numeric('amount_talent', { precision: 12, scale: 2 }).notNull().default('0'),
  // NO commission_amount / commission_pct columns (decisión #11 — calculado en TS)
  // NO currency (decisión #2 — EUR-only)
  // NO brand_paid / talent_paid (decisión #5 — calculado desde invoices)

  // ── Estimates vs. Actuals (competitive intelligence gap vs Workamajig) ──
  // Presupuesto estimado al crear la propuesta (puede diferir del amount_brand/amount_talent final)
  estimatedCostAgency: numeric('estimated_cost_agency', { precision: 12, scale: 2 }), // coste interno estimado (horas + gastos)
  estimatedMarginPct: numeric('estimated_margin_pct', { precision: 5, scale: 2 }),   // margen previsto en %
  // Compliance CNMC: checklist de campaña antes de activar
  cnmcChecklistOk: boolean('cnmc_checklist_ok').notNull().default(false), // todos los items del checklist verificados
  cnmcChecklistAt: timestamp('cnmc_checklist_at', { withTimezone: true }),  // cuándo se verificó
  cnmcChecklistUserId: text('cnmc_checklist_user_id'),                     // quién lo verificó

  brandPaymentMethod: campaignPaymentMethodEnum('brand_payment_method'),
  talentPaymentMethod: campaignPaymentMethodEnum('talent_payment_method'),

  visibility: varchar('visibility', { length: 10 }).notNull().default('team'),

  archivedAt: timestamp('archived_at', { withTimezone: true }), // soft delete (decisión #4)

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
]);
