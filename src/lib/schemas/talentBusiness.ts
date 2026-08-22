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

/** Acepta el ID puro o una URL de carpeta de Google Drive y devuelve solo el ID. */
export function normalizeGoogleDriveFolderId(value: string): string | null {
  const input = value.trim();
  if (/^[A-Za-z0-9_-]{10,255}$/.test(input)) return input;

  const match = input.match(
    /^https?:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{10,255})(?:[/?#]|$)/i,
  );
  return match?.[1] ?? null;
}

const optGoogleDriveFolderId = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.union([
    z.null(),
    z.string().max(500).transform((value, ctx) => {
      const folderId = normalizeGoogleDriveFolderId(value);
      if (folderId) return folderId;
      ctx.addIssue({ code: 'custom', message: 'Carpeta de Google Drive inválida' });
      return z.NEVER;
    }),
  ]).optional(),
);

export const updateTalentBusinessSchema = z.object({
  talentId: z.coerce.number().int().positive(),
  telegram: optStr(80),
  whatsapp: optStr(40),
  discord: optStr(80),
  contactEmail: optEmail,
  googleDriveFolderId: optGoogleDriveFolderId,
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
