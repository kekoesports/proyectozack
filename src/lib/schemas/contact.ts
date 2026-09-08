import { z } from 'zod';

const contactCreatorPlatforms = [
  'twitch',
  'youtube',
  'instagram',
  'tiktok',
  'kick',
  'otra',
] as const;

export const contactBodySchema = z.object({
  name: z.string().min(2, 'Escribe tu nombre').max(100),
  email: z.email('Escribe un email válido').max(200),
  phone: z.string().max(30).optional(),
  type: z.enum(['brand', 'talent', 'other'], { error: 'Selecciona una opción' }),
  company: z.string().max(100).optional(),
  message: z.string().min(10, 'Cuéntanos un poco más').max(5000),
  // Brand-specific
  budget: z.string().max(20).optional(),
  timeline: z.string().max(30).optional(),
  audience: z.string().max(200).optional(),
  vertical: z.string().max(30).optional(),
  campaignType: z.string().max(50).optional(),
  // Creator-specific
  country: z.string().trim().max(100).optional(),
  platform: z.enum(contactCreatorPlatforms).optional(),
  channelUrl: z.url({ protocol: /^https?$/ }).max(500).optional(),
  contentCategory: z.string().trim().max(100).optional(),
  followers: z.string().trim().max(50).optional(),
  averageAudience: z.string().trim().max(100).optional(),
  otherLinks: z.string().trim().max(1_000).optional(),
  // Campos heredados conservados para consumidores internos anteriores.
  viewers: z.string().max(100).optional(),
  monetization: z.string().max(200).optional(),
}).superRefine((input, ctx) => {
  if (input.type !== 'talent') return;

  const requiredCreatorFields = [
    ['country', input.country, 'Indica tu país'],
    ['platform', input.platform, 'Selecciona tu plataforma principal'],
    ['channelUrl', input.channelUrl, 'Pega la URL completa de tu canal'],
    ['contentCategory', input.contentCategory, 'Indica tu juego o contenido principal'],
  ] as const;

  for (const [field, value, message] of requiredCreatorFields) {
    if (!value) {
      ctx.addIssue({ code: 'custom', path: [field], message });
    }
  }
});

export type ContactBody = z.infer<typeof contactBodySchema>;
