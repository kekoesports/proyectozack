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
