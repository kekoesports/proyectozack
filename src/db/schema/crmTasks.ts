import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  date,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { isNotNull, relations } from 'drizzle-orm';
import { user } from './auth';
import { crmTaskTemplates } from './crmTaskTemplates';
import { crmTaskPriorityEnum, crmTaskStatusEnum } from './crmTaskEnums';

export const crmTaskRelatedTypeEnum = pgEnum('crm_task_related_type', [
  'brand',
  'talent',
  'campaign',
  'invoice',
  'general',
]);

export const crmTasks = pgTable(
  'crm_tasks',
  {
    id: serial('id').primaryKey(),

    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),

    ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    assignedToUserId: text('assigned_to_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    recurrenceTemplateId: integer('recurrence_template_id').references(() => crmTaskTemplates.id, {
      onDelete: 'set null',
    }),

    startDate: date('start_date'),
    dueDate: date('due_date'),
    priority: crmTaskPriorityEnum('priority').notNull().default('media'),
    status: crmTaskStatusEnum('status').notNull().default('pendiente'),
    category: varchar('category', { length: 40 }).notNull(),

    // ISO week like "2026-W17"; computed in the app (see src/lib/week.ts).
    weekLabel: varchar('week_label', { length: 8 }).notNull(),
    rolledOver: boolean('rolled_over').notNull().default(false),
    rolledFromWeek: varchar('rolled_from_week', { length: 8 }),

    relatedType: crmTaskRelatedTypeEnum('related_type'),
    relatedId: integer('related_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('crm_tasks_owner_idx').on(t.ownerId),
    index('crm_tasks_assigned_idx').on(t.assignedToUserId),
    index('crm_tasks_week_idx').on(t.weekLabel),
    index('crm_tasks_status_idx').on(t.status),
    index('crm_tasks_week_owner_idx').on(t.weekLabel, t.ownerId),
    index('crm_tasks_week_status_idx').on(t.weekLabel, t.status),
    index('crm_tasks_related_idx').on(t.relatedType, t.relatedId),
    index('crm_tasks_template_idx').on(t.recurrenceTemplateId),
    uniqueIndex('crm_tasks_template_week_unique')
      .on(t.recurrenceTemplateId, t.assignedToUserId, t.weekLabel)
      .where(isNotNull(t.recurrenceTemplateId)),
  ],
);

export const crmTasksRelations = relations(crmTasks, ({ one }) => ({
  owner: one(user, { fields: [crmTasks.ownerId], references: [user.id] }),
  assignedTo: one(user, { fields: [crmTasks.assignedToUserId], references: [user.id] }),
  createdBy: one(user, { fields: [crmTasks.createdByUserId], references: [user.id] }),
  recurrenceTemplate: one(crmTaskTemplates, {
    fields: [crmTasks.recurrenceTemplateId],
    references: [crmTaskTemplates.id],
  }),
}));
