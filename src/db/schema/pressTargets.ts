import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const pressTargetCategoryEnum = pgEnum('press_target_category', [
  'gaming-generalista',
  'cs2-fps',
  'igaming-skins',
  'prensa-local',
  'foro',
  'periodista',
  'otro',
]);

export const pressTargetOutreachStatusEnum = pgEnum('press_target_outreach_status', [
  'pendiente',
  'contactado',
  'respondido',
  'publicado',
  'descartado',
]);

export const pressTargetCostModelEnum = pgEnum('press_target_cost_model', [
  'gratuito-editorial',
  'gratuito-autopublicacion',
  'pago',
  'desconocido',
]);

export const pressTargetBacklinkTypeEnum = pgEnum('press_target_backlink_type', [
  'editorial',
  'comunidad',
  'perfil',
  'desconocido',
]);

export const pressTargets = pgTable(
  'press_targets',
  {
    id: serial('id').primaryKey(),

    domain: varchar('domain', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 300 }).notNull(),
    url: text('url').notNull(),
    region: varchar('region', { length: 20 }).notNull(),
    submission: varchar('submission', { length: 500 }).notNull(),
    submissionUrl: text('submission_url'),
    contactEmail: varchar('contact_email', { length: 320 }),
    summary: text('summary'),
    category: pressTargetCategoryEnum('category').notNull(),
    validatedAt: timestamp('validated_at', { withTimezone: true }),
    costModel: pressTargetCostModelEnum('cost_model').notNull().default('desconocido'),
    backlinkType: pressTargetBacklinkTypeEnum('backlink_type').notNull().default('desconocido'),
    fitScore: integer('fit_score').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),

    notes: text('notes'),
    outreachStatus: pressTargetOutreachStatusEnum('outreach_status').notNull().default('pendiente'),
    assignedToUserId: text('assigned_to_user_id').references(() => user.id, { onDelete: 'set null' }),
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('press_targets_category_idx').on(t.category),
    index('press_targets_outreach_status_idx').on(t.outreachStatus),
    index('press_targets_region_idx').on(t.region),
    index('press_targets_cost_model_idx').on(t.costModel),
    index('press_targets_fit_score_idx').on(t.fitScore),
    index('press_targets_assigned_idx').on(t.assignedToUserId),
  ],
);
