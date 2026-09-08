import { z } from 'zod';

export const CREATOR_PLATFORMS = [
  'twitch',
  'youtube',
  'instagram',
  'tiktok',
  'kick',
  'otra',
] as const;

export const creatorApplySchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(100),
  email: z.email('Escribe un email válido').max(200),
  country: z.string().trim().min(2, 'Indica tu país').max(100),
  platform: z.enum(CREATOR_PLATFORMS, { message: 'Selecciona tu plataforma principal' }),
  handle: z.url({ protocol: /^https?$/, message: 'Pega la URL completa de tu canal' }).max(500),
  contentCategory: z.string().trim().min(2, 'Indica tu juego o contenido principal').max(100),
  followers: z.string().trim().max(50).optional(),
  averageAudience: z.string().trim().max(100).optional(),
  otherLinks: z.string().trim().max(1_000).optional(),
  message: z.string().trim().max(2_000).optional(),
});

export type CreatorApplyInput = z.infer<typeof creatorApplySchema>;
