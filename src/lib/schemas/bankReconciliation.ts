import { z } from 'zod';

export const createBankAccountSchema = z.object({
  displayName: z.string().min(1).max(200),
  provider: z.enum(['manual', 'wise', 'stripe', 'bank', 'paypal', 'other']).default('manual'),
  bankName: z.string().max(200).optional(),
  ibanMasked: z.string().max(40).optional(),
  currency: z.string().length(3).default('EUR'),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

export const bankColumnMappingSchema = z.object({
  bookingDate: z.coerce.number().int().min(0).optional(),
  valueDate: z.coerce.number().int().min(0).optional(),
  amount: z.coerce.number().int().min(0).optional(),
  currency: z.coerce.number().int().min(0).optional(),
  direction: z.coerce.number().int().min(0).optional(),
  description: z.coerce.number().int().min(0).optional(),
  counterpartyName: z.coerce.number().int().min(0).optional(),
  counterpartyAccount: z.coerce.number().int().min(0).optional(),
  reference: z.coerce.number().int().min(0).optional(),
  category: z.coerce.number().int().min(0).optional(),
});

export const importBankFileSchema = z.object({
  bankAccountId: z.coerce.number().int().positive().optional(),
  mapping: bankColumnMappingSchema,
});

export type ImportBankFileInput = z.infer<typeof importBankFileSchema>;

export const matchActionSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  transactionId: z.coerce.number().int().positive(),
});

export type MatchActionInput = z.infer<typeof matchActionSchema>;

export const approveMatchFromCandidateSchema = z.object({
  transactionId: z.coerce.number().int().positive(),
  matchType: z.string().min(1).max(50),
  matchedEntityId: z.coerce.number().int().positive(),
  confidence: z.coerce.number().int().min(0).max(100),
  matchReason: z.string().max(500).default(''),
});

export type ApproveMatchFromCandidateInput = z.infer<typeof approveMatchFromCandidateSchema>;

export const rejectMatchFromCandidateSchema = z.object({
  transactionId: z.coerce.number().int().positive(),
  matchType: z.string().min(1).max(50),
  matchedEntityId: z.coerce.number().int().positive(),
  confidence: z.coerce.number().int().min(0).max(100),
  matchReason: z.string().max(500).default(''),
});

export type RejectMatchFromCandidateInput = z.infer<typeof rejectMatchFromCandidateSchema>;
