import type { InferSelectModel } from 'drizzle-orm';
import type {
  bankAccounts,
  bankCards,
  bankImports,
  bankTransactions,
  transactionMatches,
  bankReconciliationEvents,
} from '@/db/schema';

export type BankAccount = InferSelectModel<typeof bankAccounts>;
export type BankCard = InferSelectModel<typeof bankCards>;
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
export type BankReceiptStatus = NonNullable<BankTransaction['receiptStatus']>;
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
  readonly currency: string;
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
  readonly issuerName: string | null;
  readonly totalTransactions: number;
  readonly unmatchedCount: number;
  readonly matchedCount: number;
};

export type BankEntityReconciliationKpis = {
  readonly issuerCompanyId: number | null;
  readonly issuerName: string;
  readonly totalTransactions: number;
  readonly importedUnmatched: number;
  readonly matched: number;
  readonly ignored: number;
  readonly needsReview: number;
};

export type BankMonthlyCloseCurrency = {
  readonly currency: string;
  readonly income: number;
  readonly expenses: number;
  readonly net: number;
  readonly fxFees: number;
};

export type InvoiceMonthlyCloseCurrency = {
  readonly currency: string;
  readonly issuedCount: number;
  readonly draftCount: number;
  readonly billed: number;
  readonly collected: number;
  readonly outstanding: number;
};

export type BankMonthlyCloseSummary = {
  readonly month: string;
  readonly transactions: number;
  readonly unmatched: number;
  readonly missingReceipts: number;
  readonly bankCurrencies: readonly BankMonthlyCloseCurrency[];
  readonly invoiceCurrencies: readonly InvoiceMonthlyCloseCurrency[];
};

export type SlashCardSpendSummary = {
  readonly cardId: number;
  readonly displayName: string;
  readonly ownerLabel: string | null;
  readonly last4: string;
  readonly status: string;
  readonly currentMonthSpend: number;
  readonly last30DaysSpend: number;
  readonly transactionCount: number;
  readonly missingReceipts: number;
  readonly fxFees: number;
  readonly cashback: number;
};
