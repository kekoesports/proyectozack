import {
  pgTable, serial, integer, varchar, text, timestamp, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { campaigns } from './campaigns';
import { user } from './auth';

export const contracts = pgTable(
  'contracts',
  {
    id:               serial('id').primaryKey(),
    campaignId:       integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),

    fileUrl:          text('file_url'),
    filePath:         text('file_path'),
    fileName:         varchar('file_name',  { length: 260 }),
    signedFileUrl:    text('signed_file_url'),

    status:           varchar('status', { length: 30 }).notNull().default('draft'),
    // draft | pending_signature | signed | rejected

    sentAt:           timestamp('sent_at',    { withTimezone: true }),
    signedAt:         timestamp('signed_at',  { withTimezone: true }),

    notes:            text('notes'),
    createdByUserId:  text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt:        timestamp('created_at',  { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp('updated_at',  { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('contracts_campaign_idx').on(t.campaignId),
    index('contracts_status_idx').on(t.status),
  ],
);

export const contractSigners = pgTable(
  'contract_signers',
  {
    id:          serial('id').primaryKey(),
    contractId:  integer('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),

    name:        varchar('name',  { length: 200 }).notNull(),
    email:       varchar('email', { length: 180 }).notNull(),
    role:        varchar('role',  { length: 30  }).notNull().default('brand'),
    // brand | influencer | agency

    status:      varchar('status', { length: 20 }).notNull().default('pending'),
    // pending | signed | rejected

    token:       varchar('token', { length: 64 }).notNull().unique(),

    signedAt:    timestamp('signed_at',  { withTimezone: true }),
    ipAddress:   varchar('ip_address',   { length: 60  }),
    signedName:  varchar('signed_name',  { length: 200 }),

    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('contract_signers_contract_idx').on(t.contractId),
    index('contract_signers_token_idx').on(t.token),
  ],
);

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  campaign:    one(campaigns,  { fields: [contracts.campaignId],      references: [campaigns.id]  }),
  createdBy:   one(user,       { fields: [contracts.createdByUserId], references: [user.id]       }),
  signers:     many(contractSigners),
}));

export const contractSignersRelations = relations(contractSigners, ({ one }) => ({
  contract: one(contracts, { fields: [contractSigners.contractId], references: [contracts.id] }),
}));
