'server-only';

import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  bankAccounts,
  bankImports,
  bankTransactions,
  transactionMatches,
  bankReconciliationEvents,
} from '@/db/schema';
import type {
  BankAccount,
  BankAccountWithStats,
  BankImport,
  BankTransaction,
  BankTransactionWithMatches,
  TransactionMatch,
  BankTransactionStatus,
  TransactionMatchStatus,
} from '@/types';

// ── Bank Accounts ─────────────────────────────────────────────────────

export async function listBankAccounts(): Promise<readonly BankAccount[]> {
  return db.select().from(bankAccounts).orderBy(asc(bankAccounts.displayName));
}

export async function listBankAccountsWithStats(): Promise<readonly BankAccountWithStats[]> {
  const rows = await db.select().from(bankAccounts).orderBy(asc(bankAccounts.displayName));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const [totalRows, unmatchedRows] = await Promise.all([
    db
      .select({ accountId: bankTransactions.bankAccountId, total: count() })
      .from(bankTransactions)
      .where(inArray(bankTransactions.bankAccountId, ids))
      .groupBy(bankTransactions.bankAccountId),
    db
      .select({ accountId: bankTransactions.bankAccountId, unmatched: count() })
      .from(bankTransactions)
      .where(
        and(
          inArray(bankTransactions.bankAccountId, ids),
          eq(bankTransactions.status, 'imported'),
        ),
      )
      .groupBy(bankTransactions.bankAccountId),
  ]);

  const totalMap = new Map(totalRows.map((r) => [r.accountId, Number(r.total)]));
  const unmatchedMap = new Map(unmatchedRows.map((r) => [r.accountId, Number(r.unmatched)]));

  return rows.map((row) => {
    const total = totalMap.get(row.id) ?? 0;
    const unmatched = unmatchedMap.get(row.id) ?? 0;
    return { ...row, totalTransactions: total, unmatchedCount: unmatched, matchedCount: total - unmatched };
  });
}

export async function getBankAccount(id: number): Promise<BankAccount | null> {
  const [row] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
  return row ?? null;
}

export async function createBankAccount(
  data: Omit<typeof bankAccounts.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<BankAccount> {
  const [row] = await db.insert(bankAccounts).values(data).returning();
  if (!row) throw new Error('Failed to create bank account');
  return row;
}

export async function updateBankAccount(
  id: number,
  data: Partial<Omit<typeof bankAccounts.$inferInsert, 'id' | 'createdAt'>>,
): Promise<BankAccount | null> {
  const [row] = await db
    .update(bankAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bankAccounts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteBankAccount(id: number): Promise<void> {
  await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
}

// ── Bank Imports ──────────────────────────────────────────────────────

export async function listBankImports(bankAccountId?: number): Promise<readonly BankImport[]> {
  return db
    .select()
    .from(bankImports)
    .where(bankAccountId !== undefined ? eq(bankImports.bankAccountId, bankAccountId) : undefined)
    .orderBy(desc(bankImports.createdAt));
}

export async function getBankImport(id: number): Promise<BankImport | null> {
  const [row] = await db.select().from(bankImports).where(eq(bankImports.id, id)).limit(1);
  return row ?? null;
}

export async function getBankImportByHash(
  fileHash: string,
  bankAccountId: number | null,
): Promise<BankImport | null> {
  const [row] = await db
    .select()
    .from(bankImports)
    .where(
      and(
        eq(bankImports.fileHash, fileHash),
        bankAccountId !== null
          ? eq(bankImports.bankAccountId, bankAccountId)
          : sql`${bankImports.bankAccountId} IS NULL`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createBankImport(
  data: Omit<typeof bankImports.$inferInsert, 'id' | 'createdAt'>,
): Promise<BankImport> {
  const [row] = await db.insert(bankImports).values(data).returning();
  if (!row) throw new Error('Failed to create bank import');
  return row;
}

export async function updateBankImport(
  id: number,
  data: Partial<Omit<typeof bankImports.$inferInsert, 'id' | 'createdAt'>>,
): Promise<BankImport | null> {
  const [row] = await db
    .update(bankImports)
    .set(data)
    .where(eq(bankImports.id, id))
    .returning();
  return row ?? null;
}

// ── Bank Transactions ─────────────────────────────────────────────────

export async function listBankTransactions(opts: {
  bankAccountId?: number;
  status?: BankTransactionStatus;
  limit?: number;
  offset?: number;
}): Promise<readonly BankTransaction[]> {
  const { bankAccountId, status, limit = 50, offset = 0 } = opts;

  const conditions = [
    ...(bankAccountId !== undefined ? [eq(bankTransactions.bankAccountId, bankAccountId)] : []),
    ...(status !== undefined ? [eq(bankTransactions.status, status)] : []),
  ];

  return db
    .select()
    .from(bankTransactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bankTransactions.bookingDate), desc(bankTransactions.id))
    .limit(limit)
    .offset(offset);
}

export async function countBankTransactions(opts: {
  bankAccountId?: number;
  status?: BankTransactionStatus;
}): Promise<number> {
  const { bankAccountId, status } = opts;
  const conditions = [
    ...(bankAccountId !== undefined ? [eq(bankTransactions.bankAccountId, bankAccountId)] : []),
    ...(status !== undefined ? [eq(bankTransactions.status, status)] : []),
  ];
  const [row] = await db
    .select({ total: count() })
    .from(bankTransactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return Number(row?.total ?? 0);
}

export async function getBankTransaction(id: number): Promise<BankTransactionWithMatches | null> {
  const [row] = await db
    .select()
    .from(bankTransactions)
    .where(eq(bankTransactions.id, id))
    .limit(1);
  if (!row) return null;

  const matches = await db
    .select()
    .from(transactionMatches)
    .where(eq(transactionMatches.transactionId, id))
    .orderBy(desc(transactionMatches.confidence));

  return { ...row, matches };
}

export async function getBankTransactionByHash(
  transactionHash: string,
  bankAccountId: number | null,
): Promise<BankTransaction | null> {
  const [row] = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.transactionHash, transactionHash),
        bankAccountId !== null
          ? eq(bankTransactions.bankAccountId, bankAccountId)
          : sql`${bankTransactions.bankAccountId} IS NULL`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createBankTransaction(
  data: Omit<typeof bankTransactions.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<BankTransaction> {
  const [row] = await db.insert(bankTransactions).values(data).returning();
  if (!row) throw new Error('Failed to create bank transaction');
  return row;
}

export async function updateBankTransactionStatus(
  id: number,
  status: BankTransactionStatus,
): Promise<void> {
  await db
    .update(bankTransactions)
    .set({ status, updatedAt: new Date() })
    .where(eq(bankTransactions.id, id));
}

// ── Transaction Matches ───────────────────────────────────────────────

export async function listMatchesForTransaction(
  transactionId: number,
): Promise<readonly TransactionMatch[]> {
  return db
    .select()
    .from(transactionMatches)
    .where(eq(transactionMatches.transactionId, transactionId))
    .orderBy(desc(transactionMatches.confidence));
}

export async function createTransactionMatch(
  data: Omit<typeof transactionMatches.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<TransactionMatch> {
  const [row] = await db.insert(transactionMatches).values(data).returning();
  if (!row) throw new Error('Failed to create transaction match');
  return row;
}

export async function approveMatchFromCandidate(opts: {
  transactionId: number;
  matchType: string;
  matchedEntityId: number;
  confidence: number;
  matchReason: string;
  approvedByUserId: string;
}): Promise<TransactionMatch> {
  const { transactionId, matchType, matchedEntityId, confidence, matchReason, approvedByUserId } = opts;
  const now = new Date();
  let match: TransactionMatch | undefined;
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(transactionMatches)
      .values({
        transactionId,
        matchType: matchType as TransactionMatch['matchType'],
        matchedEntityId,
        confidence: Math.round(confidence),
        matchReason,
        status: 'approved',
        approvedByUserId,
        approvedAt: now,
      })
      .returning();
    if (!inserted) throw new Error('Failed to insert match');
    match = inserted;
    await tx
      .update(bankTransactions)
      .set({ status: 'matched', updatedAt: now })
      .where(eq(bankTransactions.id, transactionId));
  });
  if (!match) throw new Error('Failed to approve match');
  return match;
}

export async function rejectMatchFromCandidate(opts: {
  transactionId: number;
  matchType: string;
  matchedEntityId: number;
  confidence: number;
  matchReason: string;
  rejectedByUserId: string;
}): Promise<TransactionMatch> {
  const { transactionId, matchType, matchedEntityId, confidence, matchReason, rejectedByUserId } = opts;
  let match: TransactionMatch | undefined;
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(transactionMatches)
      .values({
        transactionId,
        matchType: matchType as TransactionMatch['matchType'],
        matchedEntityId,
        confidence: Math.round(confidence),
        matchReason,
        status: 'rejected',
        approvedByUserId: rejectedByUserId,
      })
      .returning();
    if (!inserted) throw new Error('Failed to insert match');
    match = inserted;
    await tx
      .update(bankTransactions)
      .set({ status: 'needs_review', updatedAt: new Date() })
      .where(eq(bankTransactions.id, transactionId));
  });
  if (!match) throw new Error('Failed to reject match');
  return match;
}

export async function updateMatchStatus(
  matchId: number,
  status: TransactionMatchStatus,
  approvedByUserId?: string,
): Promise<TransactionMatch | null> {
  const [row] = await db
    .update(transactionMatches)
    .set({
      status,
      updatedAt: new Date(),
      ...(approvedByUserId !== undefined ? { approvedByUserId } : {}),
      ...(status === 'approved' ? { approvedAt: new Date() } : {}),
    })
    .where(eq(transactionMatches.id, matchId))
    .returning();
  return row ?? null;
}

// ── Reconciliation Events ─────────────────────────────────────────────

export async function listReconciliationEvents(
  transactionId: number,
): Promise<readonly (typeof bankReconciliationEvents.$inferSelect)[]> {
  return db
    .select()
    .from(bankReconciliationEvents)
    .where(eq(bankReconciliationEvents.transactionId, transactionId))
    .orderBy(asc(bankReconciliationEvents.createdAt));
}

export async function logReconciliationEvent(
  data: Omit<typeof bankReconciliationEvents.$inferInsert, 'id' | 'createdAt'>,
): Promise<void> {
  try {
    await db.insert(bankReconciliationEvents).values(data);
  } catch {
    // best-effort logging
  }
}

// ── Summary / KPIs ────────────────────────────────────────────────────

export async function getBankReconciliationKpis(bankAccountId?: number): Promise<{
  readonly totalTransactions: number;
  readonly importedUnmatched: number;
  readonly matched: number;
  readonly ignored: number;
  readonly needsReview: number;
}> {
  const condition = bankAccountId !== undefined
    ? eq(bankTransactions.bankAccountId, bankAccountId)
    : undefined;

  const rows = await db
    .select({ status: bankTransactions.status, total: count() })
    .from(bankTransactions)
    .where(condition)
    .groupBy(bankTransactions.status);

  const byStatus = new Map(rows.map((r) => [r.status, Number(r.total)]));
  const total = [...byStatus.values()].reduce((a, b) => a + b, 0);

  return {
    totalTransactions: total,
    importedUnmatched: byStatus.get('imported') ?? 0,
    matched: byStatus.get('matched') ?? 0,
    ignored: byStatus.get('ignored') ?? 0,
    needsReview: byStatus.get('needs_review') ?? 0,
  };
}
