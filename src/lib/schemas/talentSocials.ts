import { z } from 'zod';

import { StrictIdSchema } from '@/lib/schemas/common';

// Canonical platform names for talent_socials.platform.
// Legacy short keys (yt, tw, ig, tt, twitter) normalized to canonical via
// migration 0065_normalize_platform_names.sql — never write them again.
// normalizePlatform() in lib/utils/platform.ts handles any legacy input from
// external sources defensively before it reaches the DB.
export const SOCIAL_PLATFORM_VALUES = [
  'twitch',
  'youtube',
  'kick',
  'instagram',
  'tiktok',
  'x',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM_VALUES)[number];

export const SocialPlatformSchema = z.enum(SOCIAL_PLATFORM_VALUES);

// Discord es una red de perfil válida, pero no una plataforma de entregables
// comerciales. Mantener la lista ampliada separada evita ofrecer Discord en
// los formularios de campañas que reutilizan SOCIAL_PLATFORM_VALUES.
export const TALENT_PROFILE_SOCIAL_PLATFORM_VALUES = [
  ...SOCIAL_PLATFORM_VALUES,
  'discord',
] as const;

export const TalentProfileSocialPlatformSchema = z.enum(TALENT_PROFILE_SOCIAL_PLATFORM_VALUES);

export const TalentSocialEntrySchema = z.object({
  id: StrictIdSchema.optional(),
  platform: TalentProfileSocialPlatformSchema,
  handle: z.string().trim().min(1, 'Handle obligatorio').max(120, 'Handle demasiado largo'),
  profileUrl: z.string().trim().max(2048, 'URL demasiado larga').optional(),
  followersDisplay: z.string().trim().max(20, 'Seguidores demasiado largo').optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const TalentSocialsUpdateSchema = z.object({
  talentId: StrictIdSchema,
  entries: z.array(TalentSocialEntrySchema)
    .min(1, 'Debe mantenerse al menos una red social')
    .max(20, 'Demasiadas redes sociales'),
});

export type TalentSocialEntryInput = z.input<typeof TalentSocialEntrySchema>;
