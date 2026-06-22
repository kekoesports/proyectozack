import {
  pgTable, serial, integer, varchar, text, timestamp, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contractTemplates } from './contractTemplates';
import { talents } from './talents';
import { crmBrands } from './crmBrands';
import { campaigns } from './campaigns';
import { user } from './auth';

export const generatedContracts = pgTable(
  'generated_contracts',
  {
    id:               serial('id').primaryKey(),
    title:            varchar('title', { length: 200 }).notNull(),
    content:          text('content').notNull(),
    varsJson:         text('vars_json'),

    templateId:       integer('template_id').references(() => contractTemplates.id, { onDelete: 'set null' }),
    talentId:         integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),
    brandId:          integer('brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),
    campaignId:       integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),

    status:           varchar('status', { length: 30 }).notNull().default('draft'),
    // draft | sent | signed | archived

    fileUrl:          text('file_url'),
    filePath:         text('file_path'),
    fileName:         varchar('file_name', { length: 300 }),

    notes:            text('notes'),
    sentAt:           timestamp('sent_at',   { withTimezone: true }),
    signedAt:         timestamp('signed_at', { withTimezone: true }),

    createdByUserId:  text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('generated_contracts_status_idx').on(t.status),
    index('generated_contracts_talent_idx').on(t.talentId),
    index('generated_contracts_brand_idx').on(t.brandId),
    index('generated_contracts_created_at_idx').on(t.createdAt),
  ],
);

export const generatedContractsRelations = relations(generatedContracts, ({ one }) => ({
  template:   one(contractTemplates, { fields: [generatedContracts.templateId],      references: [contractTemplates.id] }),
  talent:     one(talents,           { fields: [generatedContracts.talentId],         references: [talents.id]           }),
  brand:      one(crmBrands,         { fields: [generatedContracts.brandId],          references: [crmBrands.id]         }),
  campaign:   one(campaigns,         { fields: [generatedContracts.campaignId],       references: [campaigns.id]         }),
  createdBy:  one(user,              { fields: [generatedContracts.createdByUserId],  references: [user.id]              }),
}));
