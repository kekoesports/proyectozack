import { z } from 'zod';

export const createSheetSourceSchema = z.object({
  brandName: z.string().min(1).max(200),
  crmBrandId: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
  sourceTitle: z.string().max(300).optional(),
  googleSheetUrl: z
    .string()
    .url()
    .refine((url) => url.includes('docs.google.com/spreadsheets'), {
      message: 'Debe ser una URL de Google Sheets (docs.google.com/spreadsheets)',
    }),
  parseMode: z.enum(['simple_columns', 'socialpro_blocks']).default('socialpro_blocks'),
  syncEnabled: z
    .preprocess((v) => v === 'true' || v === true, z.boolean())
    .default(false),
});

export type CreateSheetSourceInput = z.infer<typeof createSheetSourceSchema>;

export const detectStructureSchema = z.object({
  sourceId: z.coerce.number().int().positive(),
});

export type DetectStructureInput = z.infer<typeof detectStructureSchema>;

export const applyDetectionSchema = z.object({
  sourceId: z.coerce.number().int().positive(),
  /** JSON string of BlockPreviewItem[] to apply */
  selectedBlocks: z.string().min(1),
});

export type ApplyDetectionInput = z.infer<typeof applyDetectionSchema>;

export const syncTrackerBlockSchema = z.object({
  trackerId: z.coerce.number().int().positive(),
});

export type SyncTrackerBlockInput = z.infer<typeof syncTrackerBlockSchema>;
