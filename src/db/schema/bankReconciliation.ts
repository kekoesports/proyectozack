import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { user } from './auth';
import { issuerCompanies } from './issuedInvoices';

// ── Enums ─────────────────────────────────────────────────────────────

export const bankAccountProviderEnum = pgEnum('bank_account_provider', [
  'manual', 'wise', 'stripe', 'slash', 'bank', 'paypal', 'other',
]);

export const bankConnectionStatusEnum = pgEnum('bank_connection_status', [
  'manual', 'disconnected', 'connected', 'error',
]);

export const bankImportSourceEnum = pgEnum('bank_import_source', [
  'csv', 'xlsx',
]);

export const bankImportStatusEnum = pgEnum('bank_import_status', [
  'pending', 'processed', 'failed',
]);

export const bankTransactionDirectionEnum = pgEnum('bank_transaction_direction', [
  'income', 'expense',
]);

export const bankTransactionStatusEnum = pgEnum('bank_transaction_status', [
  'imported', 'matched', 'ignored', 'needs_review',
]);

export const transactionMatchTypeEnum = pgEnum('transaction_match_type', [
  'issued_invoice', 'internal_invoice', 'expense', 'campaign', 'client', 'unknown',
]);

export const transactionMatchStatusEnum = pgEnum('transaction_match_status', [
  'suggested', 'approved', 'rejected',
]);

export const bankReceiptStatusEnum = pgEnum('bank_receipt_status', [
  'not_required', 'missing', 'attached', 'reviewed',
]);

// ── bank_accounts ─────────────────────────────────────────────────────

export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: serial('id').primaryKey(),
    issuerCompanyId: integer('issuer_company_id').references(() => issuerCompanies.id, { onDelete: 'restrict' }),
    provider: bankAccountProviderEnum('provider').notNull().default('manual'),
    externalProviderAccountId: varchar('external_provider_account_id', { length: 200 }),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    bankName: varchar('bank_name', { length: 200 }),
    ibanMasked: varchar('iban_masked', { length: 40 }),
    accountLast4: varchar('account_last4', { length: 4 }),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    company: varchar('company', { length: 200 }),
    connectionStatus: bankConnectionStatusEnum('connection_status').notNull().default('manual'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('bank_accounts_provider_idx').on(t.provider),
    index('bank_accounts_issuer_idx').on(t.issuerCompanyId),
    uniqueIndex('bank_accounts_provider_external_uniq')
      .on(t.provider, t.externalProviderAccountId)
      .where(sql`external_provider_account_id IS NOT NULL`),
  ],
);

// ── bank_cards ────────────────────────────────────────────────────────

export const bankCards = pgTable(
  'bank_cards',
  {
    id: serial('id').primaryKey(),
    bankAccountId: integer('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 200 }).notNull(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    ownerLabel: varchar('owner_label', { length: 200 }),
    last4: varchar('last4', { length: 4 }).notNull(),
    status: varchar('status', { length: 30 }).notNull(),
    isPhysical: boolean('is_physical').notNull().default(false),
    cardGroupName: varchar('card_group_name', { length: 200 }),
    providerCreatedAt: timestamp('provider_created_at', { withTimezone: true }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('bank_cards_account_idx').on(t.bankAccountId),
    index('bank_cards_status_idx').on(t.status),
    uniqueIndex('bank_cards_account_external_uniq').on(t.bankAccountId, t.externalId),
  ],
);

// ── bank_imports ──────────────────────────────────────────────────────

export const bankImports = pgTable(
  'bank_imports',
  {
    id: serial('id').primaryKey(),
    bankAccountId: integer('bank_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
    sourceType: bankImportSourceEnum('source_type').notNull(),
    sourceFilename: varchar('source_filename', { length: 300 }).notNull(),
    fileHash: varchar('file_hash', { length: 64 }).notNull(),
    status: bankImportStatusEnum('status').notNull().default('pending'),
    totalRows: integer('total_rows').notNull().default(0),
    importedRows: integer('imported_rows').notNull().default(0),
    duplicateRows: integer('duplicate_rows').notNull().default(0),
    errorMessage: text('error_message'),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    index('bank_imports_account_idx').on(t.bankAccountId),
    index('bank_imports_status_idx').on(t.status),
    index('bank_imports_created_at_idx').on(t.createdAt),
    uniqueIndex('bank_imports_hash_account_uniq').on(t.fileHash, t.bankAccountId),
  ],
);

// ── bank_transactions ─────────────────────────────────────────────────

export const bankTransactions = pgTable(
  'bank_transactions',
  {
    id: serial('id').primaryKey(),
    bankAccountId: integer('bank_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
    bankCardId: integer('bank_card_id').references(() => bankCards.id, { onDelete: 'set null' }),
    importId: integer('import_id').references(() => bankImports.id, { onDelete: 'set null' }),
    externalId: varchar('external_id', { length: 200 }),
    transactionHash: varchar('transaction_hash', { length: 64 }).notNull(),
    bookingDate: timestamp('booking_date', { withTimezone: true }).notNull(),
    valueDate: timestamp('value_date', { withTimezone: true }),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    direction: bankTransactionDirectionEnum('direction').notNull(),
    description: text('description').notNull().default(''),
    counterpartyName: varchar('counterparty_name', { length: 300 }),
    counterpartyAccountMasked: varchar('counterparty_account_masked', { length: 40 }),
    reference: varchar('reference', { length: 300 }),
    category: varchar('category', { length: 100 }),
    providerStatus: varchar('provider_status', { length: 40 }),
    providerDetailedStatus: varchar('provider_detailed_status', { length: 60 }),
    merchantName: varchar('merchant_name', { length: 300 }),
    merchantCategoryCode: varchar('merchant_category_code', { length: 20 }),
    merchantCountry: varchar('merchant_country', { length: 80 }),
    originalAmount: numeric('original_amount', { precision: 14, scale: 2 }),
    originalCurrency: varchar('original_currency', { length: 3 }),
    conversionRate: numeric('conversion_rate', { precision: 18, scale: 8 }),
    fxFee: numeric('fx_fee', { precision: 14, scale: 2 }),
    cashback: numeric('cashback', { precision: 14, scale: 2 }),
    receiptStatus: bankReceiptStatusEnum('receipt_status').notNull().default('not_required'),
    status: bankTransactionStatusEnum('status').notNull().default('imported'),
    rawJsonSanitized: jsonb('raw_json_sanitized'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('bank_txn_account_idx').on(t.bankAccountId),
    index('bank_txn_card_idx').on(t.bankCardId),
    index('bank_txn_status_idx').on(t.status),
    index('bank_txn_booking_date_idx').on(t.bookingDate),
    index('bank_txn_direction_idx').on(t.direction),
    uniqueIndex('bank_txn_hash_account_uniq').on(t.transactionHash, t.bankAccountId),
    uniqueIndex('bank_txn_external_account_uniq')
      .on(t.externalId, t.bankAccountId)
      .where(sql`external_id IS NOT NULL`),
  ],
);

// ── slash_webhook_events ─────────────────────────────────────────────

export const slashWebhookEvents = pgTable(
  'slash_webhook_events',
  {
    id: serial('id').primaryKey(),
    eventId: varchar('event_id', { length: 200 }).notNull(),
    entityId: varchar('entity_id', { length: 200 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    status: varchar('status', { length: 30 }).notNull().default('received'),
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('slash_webhook_events_event_uniq').on(t.eventId),
    index('slash_webhook_events_status_idx').on(t.status),
  ],
);

// ── transaction_matches ───────────────────────────────────────────────

export const transactionMatches = pgTable(
  'transaction_matches',
  {
    id: serial('id').primaryKey(),
    transactionId: integer('transaction_id')
      .notNull()
      .references(() => bankTransactions.id, { onDelete: 'cascade' }),
    matchType: transactionMatchTypeEnum('match_type').notNull().default('unknown'),
    matchedEntityId: integer('matched_entity_id'),
    confidence: integer('confidence').notNull().default(0),
    matchReason: text('match_reason').notNull().default(''),
    status: transactionMatchStatusEnum('status').notNull().default('suggested'),
    approvedByUserId: text('approved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('txn_matches_transaction_idx').on(t.transactionId),
    index('txn_matches_status_idx').on(t.status),
    index('txn_matches_type_idx').on(t.matchType),
  ],
);

// ── bank_reconciliation_events ────────────────────────────────────────

export const bankReconciliationEvents = pgTable(
  'bank_reconciliation_events',
  {
    id: serial('id').primaryKey(),
    transactionId: integer('transaction_id').references(() => bankTransactions.id, { onDelete: 'set null' }),
    matchId: integer('match_id').references(() => transactionMatches.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    message: text('message').notNull().default(''),
    metadata: jsonb('metadata'),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('recon_events_transaction_idx').on(t.transactionId),
    index('recon_events_match_idx').on(t.matchId),
    index('recon_events_created_at_idx').on(t.createdAt),
  ],
);

// ── Relations ─────────────────────────────────────────────────────────

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  issuerCompany: one(issuerCompanies, { fields: [bankAccounts.issuerCompanyId], references: [issuerCompanies.id] }),
  imports: many(bankImports),
  cards: many(bankCards),
  transactions: many(bankTransactions),
}));

export const bankCardsRelations = relations(bankCards, ({ one, many }) => ({
  bankAccount: one(bankAccounts, { fields: [bankCards.bankAccountId], references: [bankAccounts.id] }),
  transactions: many(bankTransactions),
}));

export const bankImportsRelations = relations(bankImports, ({ one, many }) => ({
  bankAccount: one(bankAccounts, { fields: [bankImports.bankAccountId], references: [bankAccounts.id] }),
  createdBy: one(user, { fields: [bankImports.createdByUserId], references: [user.id] }),
  transactions: many(bankTransactions),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({ one, many }) => ({
  bankAccount: one(bankAccounts, { fields: [bankTransactions.bankAccountId], references: [bankAccounts.id] }),
  bankCard: one(bankCards, { fields: [bankTransactions.bankCardId], references: [bankCards.id] }),
  import: one(bankImports, { fields: [bankTransactions.importId], references: [bankImports.id] }),
  matches: many(transactionMatches),
  events: many(bankReconciliationEvents),
}));

export const transactionMatchesRelations = relations(transactionMatches, ({ one, many }) => ({
  transaction: one(bankTransactions, { fields: [transactionMatches.transactionId], references: [bankTransactions.id] }),
  approvedBy: one(user, { fields: [transactionMatches.approvedByUserId], references: [user.id] }),
  events: many(bankReconciliationEvents),
}));

export const bankReconciliationEventsRelations = relations(bankReconciliationEvents, ({ one }) => ({
  transaction: one(bankTransactions, { fields: [bankReconciliationEvents.transactionId], references: [bankTransactions.id] }),
  match: one(transactionMatches, { fields: [bankReconciliationEvents.matchId], references: [transactionMatches.id] }),
  createdBy: one(user, { fields: [bankReconciliationEvents.createdByUserId], references: [user.id] }),
}));
