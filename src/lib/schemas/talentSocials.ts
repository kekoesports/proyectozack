import { z } from 'zod';

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
