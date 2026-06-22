import { pgTable, serial, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const contractTemplates = pgTable(
  'contract_templates',
  {
    id:          serial('id').primaryKey(),
    name:        varchar('name', { length: 200 }).notNull(),
    type:        varchar('type', { length: 50  }).notNull().default('service_agreement'),
    content:     text('content').notNull(),
    description: text('description'),
    language:    varchar('language', { length: 10 }).notNull().default('es'),
    isActive:    boolean('is_active').notNull().default(true),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('contract_templates_type_idx').on(t.type)],
);
