'server-only';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  bankAccounts,
  bankCards,
  bankTransactions,
  issuerCompanies,
  slashWebhookEvents,
} from '@/db/schema';
import type { BankAccount, BankCard, BankTransaction, IssuerCompany, SlashCardSpendSummary } from '@/types';

export async function getIssuerCompanyByTaxId(taxId: string): Promise<IssuerCompany | null> {
  const rows = await db
    .select()
    .from(issuerCompanies)
    .where(eq(issuerCompanies.taxId, taxId))
    .limit(2);
  if (rows.length > 1) throw new Error('More than one issuer company uses the configured tax ID');
  return rows[0] ?? null;
}

export async function upsertSlashBankAccount(input: {
  readonly issuerCompanyId: number;
  readonly externalProviderAccountId: string;
  readonly displayName: string;
  readonly accountLast4: string;
}): Promise<BankAccount> {
  const [boundAccount] = await db
    .select()
    .from(bankAccounts)
    .where(and(
      eq(bankAccounts.provider, 'slash'),
      eq(bankAccounts.externalProviderAccountId, input.externalProviderAccountId),
    ))
    .limit(1);

  const [unboundAccount] = boundAccount ? [] : await db
    .select()
    .from(bankAccounts)
    .where(and(
      eq(bankAccounts.provider, 'slash'),
      eq(bankAccounts.issuerCompanyId, input.issuerCompanyId),
      eq(bankAccounts.accountLast4, input.accountLast4),
      isNull(bankAccounts.externalProviderAccountId),
    ))
    .limit(1);
  const existing = boundAccount ?? unboundAccount;

  const values = {
    issuerCompanyId: input.issuerCompanyId,
    provider: 'slash' as const,
    externalProviderAccountId: input.externalProviderAccountId,
    displayName: input.displayName,
    bankName: 'Slash / Column N.A.',
    accountLast4: input.accountLast4,
    currency: 'USD',
    connectionStatus: 'connected' as const,
    lastSyncAt: new Date(),
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(bankAccounts)
      .set(values)
      .where(eq(bankAccounts.id, existing.id))
      .returning();
    if (!updated) throw new Error('Failed to update Slash account');
    return updated;
  }

  const [created] = await db.insert(bankAccounts).values(values).returning();
  if (!created) throw new Error('Failed to create Slash account');
  return created;
}

export async function markSlashAccountsConnectionError(issuerCompanyId: number): Promise<void> {
  await db
    .update(bankAccounts)
    .set({ connectionStatus: 'error', updatedAt: new Date() })
    .where(and(
      eq(bankAccounts.provider, 'slash'),
      eq(bankAccounts.issuerCompanyId, issuerCompanyId),
    ));
}

export async function upsertSlashCard(input: {
  readonly bankAccountId: number;
  readonly externalId: string;
  readonly displayName: string;
  readonly last4: string;
  readonly status: string;
  readonly isPhysical: boolean;
  readonly cardGroupName: string | null;
  readonly providerCreatedAt: Date | null;
}): Promise<BankCard> {
  const now = new Date();
  const [row] = await db
    .insert(bankCards)
    .values({ ...input, lastSyncedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [bankCards.bankAccountId, bankCards.externalId],
      set: {
        displayName: input.displayName,
        last4: input.last4,
        status: input.status,
        isPhysical: input.isPhysical,
        cardGroupName: input.cardGroupName,
        providerCreatedAt: input.providerCreatedAt,
        lastSyncedAt: now,
        updatedAt: now,
      },
    })
    .returning();
  if (!row) throw new Error('Failed to upsert Slash card');
  return row;
}

export async function getSlashCardByExternalId(
  bankAccountId: number,
  externalId: string,
): Promise<BankCard | null> {
  const [row] = await db
    .select()
    .from(bankCards)
    .where(and(eq(bankCards.bankAccountId, bankAccountId), eq(bankCards.externalId, externalId)))
    .limit(1);
  return row ?? null;
}

export async function upsertSlashTransaction(input: Omit<
  typeof bankTransactions.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>): Promise<{ readonly transaction: BankTransaction; readonly created: boolean }> {
  if (!input.externalId || input.bankAccountId == null) {
    throw new Error('Slash transactions require externalId and bankAccountId');
  }

  const [existing] = await db
    .select()
    .from(bankTransactions)
    .where(and(
      eq(bankTransactions.bankAccountId, input.bankAccountId),
      eq(bankTransactions.externalId, input.externalId),
    ))
    .limit(1);

  if (existing) {
    const { status: _status, receiptStatus: _receiptStatus, ...providerPatch } = input;
    const [updated] = await db
      .update(bankTransactions)
      .set({ ...providerPatch, updatedAt: new Date() })
      .where(eq(bankTransactions.id, existing.id))
      .returning();
    if (!updated) throw new Error('Failed to update Slash transaction');
    return { transaction: updated, created: false };
  }

  const [created] = await db.insert(bankTransactions).values(input).returning();
  if (!created) throw new Error('Failed to create Slash transaction');
  return { transaction: created, created: true };
}

export async function setSlashCardOwnerLabel(
  id: number,
  issuerCompanyId: number,
  ownerLabel: string,
): Promise<boolean> {
  const updated = await db
    .update(bankCards)
    .set({ ownerLabel, updatedAt: new Date() })
    .where(and(
      eq(bankCards.id, id),
      sql`${bankCards.bankAccountId} IN (
        SELECT id FROM bank_accounts
        WHERE provider = 'slash' AND issuer_company_id = ${issuerCompanyId}
      )`,
    ))
    .returning({ id: bankCards.id });
  return updated.length === 1;
}

export async function markSlashCardClosedByExternalId(
  externalId: string,
  issuerCompanyId: number,
): Promise<void> {
  await db
    .update(bankCards)
    .set({ status: 'closed', lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(bankCards.externalId, externalId),
      sql`${bankCards.bankAccountId} IN (
        SELECT id FROM bank_accounts
        WHERE provider = 'slash' AND issuer_company_id = ${issuerCompanyId}
      )`,
    ));
}

function startOfCurrentMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getSlashCardSpendSummaries(
  issuerCompanyId: number,
  now = new Date(),
): Promise<readonly SlashCardSpendSummary[]> {
  const monthStart = startOfCurrentMonthUtc(now);
  const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const expenseAmount = sql<number>`CASE WHEN ${bankTransactions.direction} = 'expense' THEN ${bankTransactions.amount} ELSE 0 END`;

  const rows = await db
    .select({
      cardId: bankCards.id,
      displayName: bankCards.displayName,
      ownerLabel: bankCards.ownerLabel,
      last4: bankCards.last4,
      status: bankCards.status,
      currentMonthSpend: sql<string>`COALESCE(SUM(${expenseAmount}) FILTER (WHERE ${bankTransactions.bookingDate} >= ${monthStart}), 0)::text`,
      last30DaysSpend: sql<string>`COALESCE(SUM(${expenseAmount}) FILTER (WHERE ${bankTransactions.bookingDate} >= ${last30Days}), 0)::text`,
      transactionCount: sql<number>`COUNT(${bankTransactions.id})::int`,
      missingReceipts: sql<number>`COUNT(${bankTransactions.id}) FILTER (WHERE ${bankTransactions.receiptStatus} = 'missing')::int`,
      fxFees: sql<string>`COALESCE(SUM(${bankTransactions.fxFee}), 0)::text`,
      cashback: sql<string>`COALESCE(SUM(${bankTransactions.cashback}), 0)::text`,
    })
    .from(bankCards)
    .innerJoin(bankAccounts, eq(bankAccounts.id, bankCards.bankAccountId))
    .leftJoin(bankTransactions, eq(bankTransactions.bankCardId, bankCards.id))
    .where(and(
      eq(bankAccounts.provider, 'slash'),
      eq(bankAccounts.issuerCompanyId, issuerCompanyId),
    ))
    .groupBy(
      bankCards.id,
      bankCards.displayName,
      bankCards.ownerLabel,
      bankCards.last4,
      bankCards.status,
    )
    .orderBy(desc(sql`COALESCE(SUM(${expenseAmount}), 0)`));

  return rows.map((row) => ({
    ...row,
    currentMonthSpend: Number(row.currentMonthSpend),
    last30DaysSpend: Number(row.last30DaysSpend),
    transactionCount: Number(row.transactionCount),
    missingReceipts: Number(row.missingReceipts),
    fxFees: Number(row.fxFees),
    cashback: Number(row.cashback),
  }));
}

export type RecentSlashTransaction = {
  readonly id: number;
  readonly bookingDate: Date;
  readonly description: string;
  readonly amount: string;
  readonly currency: string;
  readonly direction: 'income' | 'expense';
  readonly merchantName: string | null;
  readonly originalAmount: string | null;
  readonly originalCurrency: string | null;
  readonly receiptStatus: 'not_required' | 'missing' | 'attached' | 'reviewed';
  readonly cardLabel: string | null;
  readonly cardLast4: string | null;
};

export async function listRecentSlashTransactions(
  issuerCompanyId: number,
  limit = 50,
): Promise<readonly RecentSlashTransaction[]> {
  return db
    .select({
      id: bankTransactions.id,
      bookingDate: bankTransactions.bookingDate,
      description: bankTransactions.description,
      amount: bankTransactions.amount,
      currency: bankTransactions.currency,
      direction: bankTransactions.direction,
      merchantName: bankTransactions.merchantName,
      originalAmount: bankTransactions.originalAmount,
      originalCurrency: bankTransactions.originalCurrency,
      receiptStatus: bankTransactions.receiptStatus,
      cardLabel: bankCards.ownerLabel,
      cardLast4: bankCards.last4,
    })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankAccounts.id, bankTransactions.bankAccountId))
    .leftJoin(bankCards, eq(bankCards.id, bankTransactions.bankCardId))
    .where(and(
      eq(bankAccounts.provider, 'slash'),
      eq(bankAccounts.issuerCompanyId, issuerCompanyId),
    ))
    .orderBy(desc(bankTransactions.bookingDate), desc(bankTransactions.id))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function registerSlashWebhookEvent(input: {
  readonly eventId: string;
  readonly entityId: string;
  readonly eventType: string;
}): Promise<boolean> {
  const inserted = await db
    .insert(slashWebhookEvents)
    .values(input)
    .onConflictDoNothing({ target: slashWebhookEvents.eventId })
    .returning({ id: slashWebhookEvents.id });
  return inserted.length > 0;
}

export async function finishSlashWebhookEvent(
  eventId: string,
  status: 'processed' | 'ignored' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await db
    .update(slashWebhookEvents)
    .set({ status, errorMessage: errorMessage?.slice(0, 500), processedAt: new Date() })
    .where(eq(slashWebhookEvents.eventId, eventId));
}
