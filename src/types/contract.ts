import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { contracts, contractSigners } from '@/db/schema';

export type Contract       = InferSelectModel<typeof contracts>;
export type NewContract    = InferInsertModel<typeof contracts>;
export type ContractSigner = InferSelectModel<typeof contractSigners>;

export type ContractWithSigners = Contract & {
  readonly signers: readonly ContractSigner[];
};

export type ContractStatus = 'draft' | 'pending_signature' | 'signed' | 'rejected';
export type SignerRole     = 'brand' | 'influencer' | 'agency';
export type SignerStatus   = 'pending' | 'signed' | 'rejected';
