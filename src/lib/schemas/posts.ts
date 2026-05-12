import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PostCreateSchema = z.object({
  title: z.string().min(5, 'Mínimo 5 caracteres').max(300),
  slug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(200)
    .regex(slugPattern, 'Solo minúsculas, números y guiones'),
  excerpt: z.string().min(10, 'Mínimo 10 caracteres').max(500),
  bodyMd: z.string().min(1, 'El cuerpo no puede estar vacío'),
  author: z.string().min(2).max(100).default('SocialPro'),
  status: z.enum(['draft', 'published']).default('draft'),
  vertical: z.enum(['blog', 'news']).default('news'),
  coverUrl: z.string().url('URL inválida').max(500).nullable().optional(),
  ogImageUrl: z.string().url('URL inválida').max(500).nullable().optional(),
  publishedAt: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? new Date(v) : null)),
  sortOrder: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0))
    .pipe(z.number().int().min(0).max(9999)),
  tags: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : [],
    ),
  talentSlugs: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
    ),
  blocksJson: z.string().optional().transform((v) => {
    if (!v || v.trim() === '') return null;
    try { return JSON.parse(v) as Record<string, unknown>; } catch { return null; }
  }),
});

export const PostUpdateSchema = PostCreateSchema.partial().extend({
  id: z.string().transform(Number).pipe(z.number().int().positive()),
});

export type PostCreateInput = z.infer<typeof PostCreateSchema>;
export type PostUpdateInput = z.infer<typeof PostUpdateSchema>;

export const EditorialSlotSchema = z.object({
  slot: z.enum(['hero', 'secondary_1', 'secondary_2', 'featured_interview', 'featured_clip', 'featured_match']),
  postId: z
    .string()
    .optional()
    .transform((v) => (v && v !== '' ? parseInt(v, 10) : null))
    .pipe(z.number().int().positive().nullable()),
});

export type EditorialSlotInput = z.infer<typeof EditorialSlotSchema>;

export const AgendaItemSchema = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres').max(200),
  team1: z.string().max(100).optional().transform((v) => v || null),
  team2: z.string().max(100).optional().transform((v) => v || null),
  tournament: z.string().max(200).optional().transform((v) => v || null),
  matchDate: z.string().min(1, 'Fecha requerida'),
  matchTime: z.string().optional().transform((v) => v || null),
  isLive: z.string().optional().transform((v) => v === 'on' || v === 'true'),
  sortOrder: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 0)).pipe(z.number().int().min(0)),
});

export const AgendaItemUpdateSchema = AgendaItemSchema.extend({
  id: z.string().transform(Number).pipe(z.number().int().positive()),
});

export type AgendaItemInput = z.infer<typeof AgendaItemSchema>;

export const FeaturedMatchSchema = z.object({
  team1:       z.string().max(100).optional().transform((v) => v || null),
  team2:       z.string().max(100).optional().transform((v) => v || null),
  team1Logo:   z.string().url().max(500).optional().or(z.literal('')).transform((v) => v || null),
  team2Logo:   z.string().url().max(500).optional().or(z.literal('')).transform((v) => v || null),
  tournament:  z.string().max(200).optional().transform((v) => v || null),
  matchDate:   z.string().optional().transform((v) => v || null),
  matchTime:   z.string().optional().transform((v) => v || null),
  matchStatus: z.enum(['upcoming', 'live', 'finished']).optional().transform((v) => v || null),
  isActive:    z.string().optional().transform((v) => v === 'on' || v === 'true'),
});
