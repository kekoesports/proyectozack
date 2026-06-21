import type { InferSelectModel } from 'drizzle-orm';
import type {
  bankAccounts,
  bankImports,
  bankTransactions,
  transactionMatches,
  bankReconciliationEvents,
} from '@/db/schema';

export type BankAccount = InferSelectModel<typeof bankAccounts>;
export type BankImport = InferSelectModel<typeof bankImports>;
export type BankTransaction = InferSelectModel<typeof bankTransactions>;
export type TransactionMatch = InferSelectModel<typeof transactionMatches>;
export type BankReconciliationEvent = InferSelectModel<typeof bankReconciliationEvents>;

export type BankAccountProvider = NonNullable<BankAccount['provider']>;
export type BankConnectionStatus = NonNullable<BankAccount['connectionStatus']>;
export type BankImportSource = NonNullable<BankImport['sourceType']>;
export type BankImportStatus = NonNullable<BankImport['status']>;
export type BankTransactionDirection = NonNullable<BankTransaction['direction']>;
export type BankTransactionStatus = NonNullable<BankTransaction['status']>;
export type TransactionMatchType = NonNullable<TransactionMatch['matchType']>;
export type TransactionMatchStatus = NonNullable<TransactionMatch['status']>;

export type BankTransactionWithMatches = BankTransaction & {
  readonly matches: readonly TransactionMatch[];
};

export type ScoredCandidate = {
  readonly entityId: number;
  readonly matchType: TransactionMatchType;
  readonly confidence: number;
  readonly matchReason: string;
  readonly amount: number;
  readonly date: string; // ISO YYYY-MM-DD — safe for RSC serialization
  readonly name: string;
  readonly reference?: string | null;
};

export type BankTransactionWithCandidates = BankTransaction & {
  readonly candidates: readonly ScoredCandidate[];
  readonly rejectedKeys: readonly string[]; // `${matchType}:${entityId}` — array for RSC serialization
};

export type BankImportWithTransactions = BankImport & {
  readonly transactions: readonly BankTransaction[];
};

export type BankAccountWithStats = BankAccount & {
  readonly totalTransactions: number;
  readonly unmatchedCount: number;
  readonly matchedCount: number;
};
