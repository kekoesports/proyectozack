'server-only';

import { createHash } from 'node:crypto';
import { env } from '@/lib/env';
import { sanitizeBankRawJson } from '@/lib/parsers/bankTransaction';
import { SlashClient, type SlashCard, type SlashCardholder, type SlashTransaction } from '@/lib/integrations/slash/client';
import {
  getIssuerCompanyByTaxId,
  getSlashCardByExternalId,
  markSlashCardClosedByExternalId,
  markSlashAccountsConnectionError,
  setSlashCardOwnerLabel,
  upsertSlashBankAccount,
  upsertSlashCard,
  upsertSlashTransaction,
} from '@/lib/queries/slashAccounting';
import type { BankAccount, BankCard } from '@/types';

const ACCOUNTING_STATUSES = new Set<SlashTransaction['detailedStatus']>([
  'settled', 'refund', 'returned', 'dispute',
]);

export class SlashConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlashConfigurationError';
  }
}

function getClient(): SlashClient {
  if (!env.SLASH_PLAYMAKER_API_KEY || !env.SLASH_PLAYMAKER_LEGAL_ENTITY_ID) {
    throw new SlashConfigurationError('Slash read-only credentials are not configured');
  }
  return new SlashClient({
    apiKey: env.SLASH_PLAYMAKER_API_KEY,
    legalEntityId: env.SLASH_PLAYMAKER_LEGAL_ENTITY_ID,
  });
}

function last4(value: string): string {
  return value.replace(/\D/g, '').slice(-4).padStart(4, '*');
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : null;
}

function cardOwnerLabel(
  card: SlashCard,
  cardholders: ReadonlyMap<string, SlashCardholder>,
): string | null {
  const holderId = optionalString(card.userData?.cardholderId) ?? optionalString(card.userData?.cardholder_id);
  const holder = holderId ? cardholders.get(holderId) : null;
  if (holder) {
    return optionalString(holder.displayText)
      ?? optionalString([holder.firstName, holder.lastName].filter(Boolean).join(' '));
  }
  return optionalString(card.userData?.ownerLabel)
    ?? optionalString(card.userData?.cardholderName)
    ?? optionalString(card.userData?.displayName);
}

function transactionHash(accountId: number, transactionId: string): string {
  return createHash('sha256').update(`slash|${accountId}|${transactionId}`).digest('hex');
}

function cents(value: number | undefined): string | null {
  return value === undefined ? null : (Math.abs(value) / 100).toFixed(2);
}

function buildSafeRaw(transaction: SlashTransaction): Record<string, unknown> {
  return sanitizeBankRawJson({
    source: 'slash_api',
    status: transaction.status,
    detailedStatus: transaction.detailedStatus,
    accountSubtype: transaction.accountSubtype,
    cardId: transaction.cardId,
    merchant: transaction.merchantData ? {
      description: transaction.merchantData.description,
      categoryCode: transaction.merchantData.categoryCode,
      country: transaction.merchantData.location?.country,
    } : null,
    originalCurrency: transaction.originalCurrency,
    cashbackInfo: transaction.cashbackInfo,
    fxFeeInfo: transaction.fxFeeInfo,
  });
}

async function persistTransaction(
  transaction: SlashTransaction,
  accountByExternalId: ReadonlyMap<string, BankAccount>,
  cardByExternalId: ReadonlyMap<string, BankCard>,
): Promise<'created' | 'updated' | 'ignored'> {
  if (!ACCOUNTING_STATUSES.has(transaction.detailedStatus)) return 'ignored';
  const account = accountByExternalId.get(transaction.accountId);
  if (!account) return 'ignored';
  const card = transaction.cardId ? cardByExternalId.get(transaction.cardId) ?? null : null;
  const merchantName = optionalString(transaction.merchantData?.description)
    ?? optionalString(transaction.merchantDescription);
  const reference = optionalString(transaction.referenceNumber)
    ?? optionalString(transaction.orderId)
    ?? optionalString(transaction.memo);
  const amount = Math.abs(transaction.amountCents) / 100;
  const direction = transaction.amountCents < 0 ? 'expense' : 'income';
  const bookingDate = new Date(transaction.date);
  if (Number.isNaN(bookingDate.getTime())) return 'ignored';

  const result = await upsertSlashTransaction({
    bankAccountId: account.id,
    bankCardId: card?.id ?? null,
    importId: null,
    externalId: transaction.id,
    transactionHash: transactionHash(account.id, transaction.id),
    bookingDate,
    valueDate: null,
    amount: amount.toFixed(2),
    currency: 'USD',
    direction,
    description: merchantName ?? transaction.description,
    counterpartyName: merchantName,
    counterpartyAccountMasked: null,
    reference,
    category: null,
    providerStatus: transaction.status,
    providerDetailedStatus: transaction.detailedStatus,
    merchantName,
    merchantCategoryCode: optionalString(transaction.merchantData?.categoryCode),
    merchantCountry: optionalString(transaction.merchantData?.location?.country),
    originalAmount: cents(transaction.originalCurrency?.amountCents),
    originalCurrency: transaction.originalCurrency?.code.toUpperCase() ?? null,
    conversionRate: transaction.originalCurrency?.conversionRate?.toFixed(8) ?? null,
    fxFee: cents(transaction.fxFeeInfo?.amountCents),
    cashback: cents(transaction.cashbackInfo?.amountCents),
    receiptStatus: direction === 'expense' ? 'missing' : 'not_required',
    status: 'imported',
    rawJsonSanitized: buildSafeRaw(transaction),
  });
  return result.created ? 'created' : 'updated';
}

export type SlashSyncResult = {
  readonly issuerCompanyId: number;
  readonly accounts: number;
  readonly cards: number;
  readonly transactionsCreated: number;
  readonly transactionsUpdated: number;
  readonly transactionsIgnored: number;
};

export async function syncSlashAccounting(): Promise<SlashSyncResult> {
  const issuer = await getIssuerCompanyByTaxId(env.SLASH_PLAYMAKER_ISSUER_TAX_ID);
  if (!issuer) throw new SlashConfigurationError('PLAYMAKER issuer company is missing in the CRM');

  const client = getClient();
  try {
    const accounts = await client.listAccounts();
    const accountByExternalId = new Map<string, BankAccount>();
    for (const account of accounts) {
      const stored = await upsertSlashBankAccount({
        issuerCompanyId: issuer.id,
        externalProviderAccountId: account.id,
        displayName: `Slash · ${account.name}`,
        accountLast4: last4(account.accountNumber),
      });
      accountByExternalId.set(account.id, stored);
    }

    const [cards, cardholders, transactions] = await Promise.all([
      client.listCards(),
      client.listCardholders(),
      client.listTransactions({
        fromDate: new Date(Date.now() - (env.SLASH_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)),
      }),
    ]);
    const cardholdersById = new Map(cardholders.map((holder) => [holder.id, holder]));
    const cardByExternalId = new Map<string, BankCard>();
    for (const card of cards) {
      const account = accountByExternalId.get(card.accountId);
      if (!account) continue;
      const stored = await upsertSlashCard({
        bankAccountId: account.id,
        externalId: card.id,
        displayName: card.name,
        last4: card.last4,
        status: card.status,
        isPhysical: card.isPhysical,
        cardGroupName: card.cardGroupName ?? null,
        providerCreatedAt: parseOptionalDate(card.createdAt),
      });
      const ownerLabel = cardOwnerLabel(card, cardholdersById);
      if (ownerLabel && !stored.ownerLabel) {
        await setSlashCardOwnerLabel(stored.id, issuer.id, ownerLabel);
      }
      cardByExternalId.set(card.id, { ...stored, ownerLabel: stored.ownerLabel ?? ownerLabel });
    }

    let transactionsCreated = 0;
    let transactionsUpdated = 0;
    let transactionsIgnored = 0;
    for (const transaction of transactions) {
      const result = await persistTransaction(transaction, accountByExternalId, cardByExternalId);
      if (result === 'created') transactionsCreated += 1;
      else if (result === 'updated') transactionsUpdated += 1;
      else transactionsIgnored += 1;
    }

    return {
      issuerCompanyId: issuer.id,
      accounts: accountByExternalId.size,
      cards: cardByExternalId.size,
      transactionsCreated,
      transactionsUpdated,
      transactionsIgnored,
    };
  } catch (error) {
    await markSlashAccountsConnectionError(issuer.id);
    throw error;
  }
}

export async function syncSlashTransactionById(transactionId: string): Promise<'created' | 'updated' | 'ignored'> {
  const issuer = await getIssuerCompanyByTaxId(env.SLASH_PLAYMAKER_ISSUER_TAX_ID);
  if (!issuer) throw new SlashConfigurationError('PLAYMAKER issuer company is missing in the CRM');
  const client = getClient();
  const transaction = await client.getTransaction(transactionId);
  const accountByExternalId = new Map(
    (await client.listAccounts()).map((account) => [account.id, account] as const),
  );
  const storedAccounts = new Map<string, BankAccount>();
  for (const account of accountByExternalId.values()) {
    storedAccounts.set(account.id, await upsertSlashBankAccount({
      issuerCompanyId: issuer.id,
      externalProviderAccountId: account.id,
      displayName: `Slash · ${account.name}`,
      accountLast4: last4(account.accountNumber),
    }));
  }
  const storedCards = new Map<string, BankCard>();
  if (transaction.cardId) {
    for (const account of storedAccounts.values()) {
      const existing = await getSlashCardByExternalId(account.id, transaction.cardId);
      if (existing) storedCards.set(transaction.cardId, existing);
    }
    if (!storedCards.has(transaction.cardId)) {
      const card = await client.getCard(transaction.cardId);
      const account = storedAccounts.get(card.accountId);
      if (account) {
        storedCards.set(card.id, await upsertSlashCard({
          bankAccountId: account.id,
          externalId: card.id,
          displayName: card.name,
          last4: card.last4,
          status: card.status,
          isPhysical: card.isPhysical,
          cardGroupName: card.cardGroupName ?? null,
          providerCreatedAt: parseOptionalDate(card.createdAt),
        }));
      }
    }
  }
  return persistTransaction(transaction, storedAccounts, storedCards);
}

export async function syncSlashCardById(cardId: string): Promise<'updated' | 'ignored'> {
  const issuer = await getIssuerCompanyByTaxId(env.SLASH_PLAYMAKER_ISSUER_TAX_ID);
  if (!issuer) throw new SlashConfigurationError('PLAYMAKER issuer company is missing in the CRM');
  const client = getClient();
  const [card, accounts, cardholders] = await Promise.all([
    client.getCard(cardId),
    client.listAccounts(),
    client.listCardholders(),
  ]);
  const account = accounts.find((candidate) => candidate.id === card.accountId);
  if (!account) return 'ignored';
  const storedAccount = await upsertSlashBankAccount({
    issuerCompanyId: issuer.id,
    externalProviderAccountId: account.id,
    displayName: `Slash · ${account.name}`,
    accountLast4: last4(account.accountNumber),
  });
  const storedCard = await upsertSlashCard({
    bankAccountId: storedAccount.id,
    externalId: card.id,
    displayName: card.name,
    last4: card.last4,
    status: card.status,
    isPhysical: card.isPhysical,
    cardGroupName: card.cardGroupName ?? null,
    providerCreatedAt: parseOptionalDate(card.createdAt),
  });
  const ownerLabel = cardOwnerLabel(card, new Map(cardholders.map((holder) => [holder.id, holder])));
  if (ownerLabel && !storedCard.ownerLabel) {
    await setSlashCardOwnerLabel(storedCard.id, issuer.id, ownerLabel);
  }
  return 'updated';
}

export async function closeSlashCardById(cardId: string): Promise<void> {
  const issuer = await getIssuerCompanyByTaxId(env.SLASH_PLAYMAKER_ISSUER_TAX_ID);
  if (!issuer) throw new SlashConfigurationError('PLAYMAKER issuer company is missing in the CRM');
  await markSlashCardClosedByExternalId(cardId, issuer.id);
}
