'server-only';

import { z } from 'zod';

const API_BASE_URL = 'https://api.slash.com';
const MAX_PAGES = 100;

const metadataSchema = z.object({
  nextCursor: z.string().nullish(),
  count: z.number().optional(),
});

export const slashAccountSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['open', 'closed']),
  name: z.string().min(1),
  accountNumber: z.string().min(4),
  routingNumber: z.string().optional(),
  createdAt: z.string().optional(),
  type: z.enum(['debit', 'charge_card']).optional(),
});

export const slashCardSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  last4: z.string().regex(/^\d{4}$/),
  name: z.string().min(1),
  status: z.enum(['active', 'paused', 'inactive', 'closed']),
  isPhysical: z.boolean(),
  cardGroupName: z.string().nullish(),
  createdAt: z.string().nullish(),
  userData: z.record(z.string(), z.unknown()).optional(),
});

const moneyInfoSchema = z.object({ amountCents: z.number() });

export const slashTransactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  description: z.string().default(''),
  amountCents: z.number().int(),
  status: z.enum(['pending', 'posted', 'failed']),
  detailedStatus: z.enum([
    'pending', 'pending_approval', 'in_review', 'canceled', 'failed', 'settled',
    'declined', 'refund', 'reversed', 'returned', 'dispute',
  ]),
  accountId: z.union([z.string(), z.number()]).transform(String),
  accountSubtype: z.enum(['cash', 'credit']).optional(),
  memo: z.string().nullish(),
  merchantData: z.object({
    description: z.string().nullish(),
    categoryCode: z.string().nullish(),
    location: z.object({
      city: z.string().nullish(),
      state: z.string().nullish(),
      country: z.string().nullish(),
      zip: z.string().nullish(),
    }).nullish(),
  }).nullish(),
  merchantDescription: z.string().nullish(),
  cardId: z.string().nullish(),
  originalCurrency: z.object({
    code: z.string().length(3),
    amountCents: z.number().int(),
    conversionRate: z.number(),
  }).nullish(),
  cashbackInfo: moneyInfoSchema.extend({ rate: z.number().optional() }).nullish(),
  fxFeeInfo: moneyInfoSchema.nullish(),
  orderId: z.string().nullish(),
  referenceNumber: z.string().nullish(),
});

const slashCardholderSchema = z.object({
  id: z.string().min(1),
  userId: z.string().nullish(),
  legalEntityId: z.string().min(1),
  displayText: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
});

export type SlashAccount = z.infer<typeof slashAccountSchema>;
export type SlashCard = z.infer<typeof slashCardSchema>;
export type SlashTransaction = z.infer<typeof slashTransactionSchema>;
export type SlashCardholder = z.infer<typeof slashCardholderSchema>;

type SlashClientConfig = {
  readonly apiKey: string;
  readonly legalEntityId: string;
};

type Page<T> = { readonly items: readonly T[]; readonly nextCursor: string | null };

export class SlashApiError extends Error {
  constructor(readonly status: number, readonly operation: string) {
    super(`Slash API ${operation} failed with HTTP ${status}`);
    this.name = 'SlashApiError';
  }
}

export class SlashClient {
  constructor(private readonly config: SlashClientConfig) {}

  private async request(path: string, query: URLSearchParams = new URLSearchParams()): Promise<unknown> {
    const url = new URL(path, API_BASE_URL);
    for (const [key, value] of query) url.searchParams.set(key, value);
    url.searchParams.set('filter:legalEntityId', this.config.legalEntityId);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': this.config.apiKey,
        'x-legal-entity': this.config.legalEntityId,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new SlashApiError(response.status, path);
    return response.json();
  }

  private async listPaginated<T>(
    path: string,
    itemSchema: z.ZodType<T>,
    query = new URLSearchParams(),
  ): Promise<readonly T[]> {
    const result: T[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const pageQuery = new URLSearchParams(query);
      if (cursor) pageQuery.set('cursor', cursor);
      const payload = await this.request(path, pageQuery);
      const parsed = z.object({ items: z.array(itemSchema), metadata: metadataSchema }).parse(payload);
      const current: Page<T> = {
        items: parsed.items,
        nextCursor: parsed.metadata.nextCursor ?? null,
      };
      result.push(...current.items);
      if (!current.nextCursor) return result;
      cursor = current.nextCursor;
    }
    throw new Error(`Slash API pagination exceeded ${MAX_PAGES} pages for ${path}`);
  }

  listAccounts(): Promise<readonly SlashAccount[]> {
    return this.listPaginated('/account', slashAccountSchema);
  }

  listCards(): Promise<readonly SlashCard[]> {
    return this.listPaginated('/card', slashCardSchema);
  }

  listCardholders(): Promise<readonly SlashCardholder[]> {
    return this.listPaginated('/cardholder', slashCardholderSchema);
  }

  listTransactions(options: {
    readonly accountId?: string;
    readonly fromDate?: Date;
  } = {}): Promise<readonly SlashTransaction[]> {
    const query = new URLSearchParams();
    if (options.accountId) query.set('filter:accountId', options.accountId);
    if (options.fromDate) query.set('filter:from_date', String(options.fromDate.getTime()));
    return this.listPaginated('/transaction', slashTransactionSchema, query);
  }

  async getTransaction(transactionId: string): Promise<SlashTransaction> {
    const payload = await this.request(`/transaction/${encodeURIComponent(transactionId)}`);
    return slashTransactionSchema.parse(payload);
  }

  async getCard(cardId: string): Promise<SlashCard> {
    // Intentionally never asks for include_pan, so PAN and CVV cannot enter SocialPro.
    const payload = await this.request(`/card/${encodeURIComponent(cardId)}`);
    return slashCardSchema.parse(payload);
  }
}
