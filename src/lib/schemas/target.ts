import { z } from 'zod';

import { IdSchema } from './common';

const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(max).optional(),
  );

const idCsvSchema = z
  .string()
  .min(1)
  .transform((raw) =>
    raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => Number(part))
      .filter((n) => Number.isInteger(n) && n > 0),
  )
  .refine((arr) => arr.length > 0, { message: 'Selecciona al menos una fila' });

// CSV booleans arrive as the string "true"/"false"
const csvBool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'string' ? v === 'true' : v))
  .optional();

// ─── CSV row from target import ─────────────────────────────────────────────

export const csvTargetRowSchema = z.object({
  username: z.string().min(1).max(200),
  platform: z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(['instagram', 'youtube', 'twitch', 'kick']).optional(),
  ),
  full_name: z.string().max(300).optional(),
  biography: z.string().optional(),
  followers: z.coerce.number().int().nonnegative().default(0),
  following: z.coerce.number().int().nonnegative().optional(),
  posts: z.coerce.number().int().nonnegative().optional(),
  is_private: csvBool,
  is_verified: csvBool,
  is_business: csvBool,
  is_creator: csvBool,
  business_category: z.string().max(200).optional(),
  profile_url: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
  external_url: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
  profile_pic_url: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
  discovered_via: z.string().max(200).optional(),
  enriched_at: z.coerce.date().optional(),
});

export type CsvTargetRow = z.infer<typeof csvTargetRowSchema>;

// ─── Manual create ───────────────────────────────────────────────────────────

const targetFields = z.object({
  username: z.string().min(1).max(200),
  fullName: z.string().max(300).optional(),
  platform: z.enum(['instagram', 'youtube', 'twitch', 'kick']),
  profileUrl: z.url(),
  profilePicUrl: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
  followers: z.coerce.number().int().nonnegative().default(0),
  following: z.coerce.number().int().nonnegative().optional(),
  posts: z.coerce.number().int().nonnegative().optional(),
  bio: z.string().optional(),
  externalUrl: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
  isPrivate: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isBusiness: z.boolean().optional(),
  isCreator: z.boolean().optional(),
  businessCategory: z.string().max(200).optional(),
  notes: z.string().optional(),
  discoveredVia: z.string().max(200).optional(),
  enrichedAt: z.coerce.date().optional(),
});

export const createTargetSchema = targetFields;
export const updateTargetSchema = targetFields.partial();

const TARGET_STATUSES = ['pendiente', 'contactado', 'finalizado', 'descartado'] as const;

export const updateTargetStatusSchema = z.object({
  id: IdSchema,
  status: z.enum(TARGET_STATUSES),
});

export const updateTargetNotesSchema = z.object({
  id: IdSchema,
  notes: z.string().max(5000).default(''),
});

export const bulkStatusSchema = z.object({
  ids: z.array(IdSchema).min(1),
  status: z.enum(TARGET_STATUSES),
});

// ─── FormData wrappers ────────────────────────────────────────────────────────

export const importTargetsCsvSchema = z.object({
  brandUserId: optStr(200),
});

export const deleteTargetsSchema = z.object({
  ids: idCsvSchema,
});

export const assignTargetsSchema = z.object({
  ids: idCsvSchema,
  brandUserId: z.string().min(1).max(200),
});

export const updateBrandTargetStatusSchema = z.object({
  targetId: IdSchema,
  status: z.enum(TARGET_STATUSES),
});

export const updateBrandTargetNotesSchema = z.object({
  targetId: IdSchema,
  notes: z.string().max(5000).default(''),
});

export type CreateTargetInput = z.infer<typeof createTargetSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;
export type UpdateTargetStatusInput = z.infer<typeof updateTargetStatusSchema>;
export type UpdateTargetNotesInput = z.infer<typeof updateTargetNotesSchema>;
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
