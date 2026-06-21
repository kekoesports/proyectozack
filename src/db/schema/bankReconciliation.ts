import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

// ── Enums ─────────────────────────────────────────────────────────────

export const bankAccountProviderEnum = pgEnum('bank_account_provider', [
  'manual', 'wise', 'stripe', 'bank', 'paypal', 'other',
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

// ── bank_accounts ─────────────────────────────────────────────────────

export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: serial('id').primaryKey(),
    provider: bankAccountProviderEnum('provider').notNull().default('manual'),
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
    status: bankTransactionStatusEnum('status').notNull().default('imported'),
    rawJsonSanitized: jsonb('raw_json_sanitized'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('bank_txn_account_idx').on(t.bankAccountId),
    index('bank_txn_status_idx').on(t.status),
    index('bank_txn_booking_date_idx').on(t.bookingDate),
    index('bank_txn_direction_idx').on(t.direction),
    uniqueIndex('bank_txn_hash_account_uniq').on(t.transactionHash, t.bankAccountId),
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

export const bankAccountsRelations = relations(bankAccounts, ({ many }) => ({
  imports: many(bankImports),
  transactions: many(bankTransactions),
}));

export const bankImportsRelations = relations(bankImports, ({ one, many }) => ({
  bankAccount: one(bankAccounts, { fields: [bankImports.bankAccountId], references: [bankAccounts.id] }),
  createdBy: one(user, { fields: [bankImports.createdByUserId], references: [user.id] }),
  transactions: many(bankTransactions),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({ one, many }) => ({
  bankAccount: one(bankAccounts, { fields: [bankTransactions.bankAccountId], references: [bankAccounts.id] }),
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
