import { z } from 'zod';

export const TALENT_VERTICALS = [
  'casino',
  'cs2_cases',
  'cs2_marketplace',
  'cs2_skin_trading',
  'sports_betting',
  'crypto',
  'gaming_brands',
  'fmcg',
  'tech',
  'otros',
] as const;

export const TALENT_VERTICAL_LABELS: Record<(typeof TALENT_VERTICALS)[number], string> = {
  casino: 'Casino',
  cs2_cases: 'CS2 Cases',
  cs2_marketplace: 'CS2 Marketplace',
  cs2_skin_trading: 'CS2 Skin Trading',
  sports_betting: 'Apuestas Deportivas',
  crypto: 'Crypto',
  gaming_brands: 'Gaming Brands',
  fmcg: 'FMCG',
  tech: 'Tech',
  otros: 'Otros',
};

const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(max).optional(),
  );

const optEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.email().max(180).optional(),
);

export const updateTalentBusinessSchema = z.object({
  talentId: z.coerce.number().int().positive(),
  telegram: optStr(80),
  whatsapp: optStr(40),
  discord: optStr(80),
  contactEmail: optEmail,
  managerName: optStr(150),
  managerEmail: optEmail,
  rateNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  verticals: z.preprocess((v): unknown[] => {
    if (Array.isArray(v)) return v as unknown[];
    if (typeof v === 'string') return v.length > 0 ? v.split(',') : [];
    return [];
  }, z.array(z.enum(TALENT_VERTICALS)).default([])),
});

export type UpdateTalentBusinessInput = z.infer<typeof updateTalentBusinessSchema>;
