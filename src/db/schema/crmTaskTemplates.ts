import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { crmTaskPriorityEnum, crmTaskRecurrenceEnum } from './crmTaskEnums';

export const crmTaskTemplates = pgTable(
  'crm_task_templates',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 40 }).notNull(),
    defaultPriority: crmTaskPriorityEnum('default_priority').notNull().default('media'),
    recurrence: crmTaskRecurrenceEnum('recurrence').notNull().default('weekly'),
    defaultAssigneeUserId: text('default_assignee_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('crm_task_templates_title_unique').on(t.title),
    index('crm_task_templates_active_idx').on(t.active),
    index('crm_task_templates_assignee_idx').on(t.defaultAssigneeUserId),
  ],
);
