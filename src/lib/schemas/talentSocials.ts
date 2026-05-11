import { z } from 'zod';

/**
 * Plataformas válidas para `talent_socials.platform`.
 *
 * Mezcla claves cortas (`yt`, `tw`) y nombres completos (`twitch`, `youtube`)
 * porque el dato histórico convive con ambos. `talent_metric_snapshots.platform`
 * en cambio usa exclusivamente nombres completos — ver CLAUDE.md gotcha.
 */
export const SOCIAL_PLATFORM_VALUES = [
  'twitch',
  'youtube',
  'yt',
  'tw',
  'kick',
  'instagram',
  'tiktok',
  'x',
  'twitter',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM_VALUES)[number];

export const SocialPlatformSchema = z.enum(SOCIAL_PLATFORM_VALUES);
