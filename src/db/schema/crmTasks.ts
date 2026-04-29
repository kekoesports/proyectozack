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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { CRM_TASK_PRIORITIES, CRM_TASK_STATUSES } from '@/lib/schemas/task';

export const crmTaskPriorityEnum = pgEnum('crm_task_priority', CRM_TASK_PRIORITIES);
export const crmTaskStatusEnum = pgEnum('crm_task_status', CRM_TASK_STATUSES);
export const crmTaskRelatedTypeEnum = pgEnum('crm_task_related_type', ['brand', 'talent', 'invoice']);

/** Plantillas semanales editables desde la UI */
export const crmTaskTemplates = pgTable(
  'crm_task_templates',
  {
    id:          serial('id').primaryKey(),
    title:       varchar('title',       { length: 200 }).notNull(),
    category:    varchar('category',    { length: 40  }).notNull(),
    priority:    crmTaskPriorityEnum('default_priority').notNull().default('media'),
    isActive:    boolean('active').notNull().default(true),
    description: text('description'),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_task_templates_active_idx').on(t.isActive),
  ],
);

export const crmTasks = pgTable(
  'crm_tasks',
  {
    id: serial('id').primaryKey(),

    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),

    ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),

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
    index('crm_tasks_week_idx').on(t.weekLabel),
    index('crm_tasks_status_idx').on(t.status),
    index('crm_tasks_week_owner_idx').on(t.weekLabel, t.ownerId),
    index('crm_tasks_week_status_idx').on(t.weekLabel, t.status),
    index('crm_tasks_related_idx').on(t.relatedType, t.relatedId),
  ],
);

export const crmTasksRelations = relations(crmTasks, ({ one }) => ({
  owner: one(user, { fields: [crmTasks.ownerId], references: [user.id] }),
}));
