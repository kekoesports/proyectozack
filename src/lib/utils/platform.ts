export const SOCIAL_PLATFORMS = [
  { key: 'yt',      label: 'YouTube',   color: '#FF0000', canonical: 'youtube'   },
  { key: 'twitch',  label: 'Twitch',    color: '#9146FF', canonical: 'twitch'    },
  { key: 'x',       label: 'X',         color: '#1DA1F2', canonical: 'x'         },
  { key: 'ig',      label: 'Instagram', color: '#E1306C', canonical: 'instagram' },
  { key: 'tt',      label: 'TikTok',    color: '#e8e8f0', canonical: 'tiktok'    },
  { key: 'kick',    label: 'Kick',      color: '#53FC18', canonical: 'kick'      },
  { key: 'discord', label: 'Discord',   color: '#5865F2', canonical: 'discord'   },
] as const;

export const TRACKABLE_SOCIAL_PLATFORM_KEYS = ['yt', 'youtube', 'twitch'] as const;

const PLATFORM_ALIASES: Record<string, string> = {
  yt: 'youtube',
  youtube: 'youtube',
  tw: 'twitch',
  twitch: 'twitch',
  x: 'x',
  twitter: 'x',
  ig: 'instagram',
  instagram: 'instagram',
  tt: 'tiktok',
  tiktok: 'tiktok',
  kick: 'kick',
  discord: 'discord',
};

export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]['key'];
export type CanonicalPlatform = (typeof SOCIAL_PLATFORMS)[number]['canonical'];
export type TrackablePlatform = Extract<CanonicalPlatform, 'youtube' | 'twitch'>;

const CANONICAL_TO_SOCIAL_KEY: Record<CanonicalPlatform, SocialPlatformKey> = {
  youtube: 'yt',
  twitch: 'twitch',
  x: 'x',
  instagram: 'ig',
  tiktok: 'tt',
  kick: 'kick',
  discord: 'discord',
};

export function normalizePlatform(platform: string): CanonicalPlatform | undefined {
  const normalized = PLATFORM_ALIASES[platform.toLowerCase()];

  if (!normalized) {
    return undefined;
  }

  return normalized as CanonicalPlatform;
}

export function normalizeTrackablePlatform(platform: string): TrackablePlatform | undefined {
  const normalized = normalizePlatform(platform);

  if (normalized === 'youtube' || normalized === 'twitch') {
    return normalized;
  }

  return undefined;
}

export function getSocialPlatformKey(platform: string): SocialPlatformKey | undefined {
  const normalized = normalizePlatform(platform);

  if (!normalized) {
    return undefined;
  }

  return CANONICAL_TO_SOCIAL_KEY[normalized];
}

export function platformMatchesKey(platform: string, key: string): boolean {
  return getSocialPlatformKey(platform) === key;
}
