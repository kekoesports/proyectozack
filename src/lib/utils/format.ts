import { getSocialPlatformKey } from '@/lib/utils/platform';

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/**
 * Parse followers display strings → number.
 * Handles: "180K", "1.2M", "9K", "8,300", plain numbers.
 * Returns 0 for unknown values like "-".
 */
export function parseFollowers(display: string): number {
  const s = display.trim();
  if (!s || !/\d/.test(s)) return 0;
  const noCommas = s.replace(/,/g, '');
  const match = noCommas.match(/^([\d]+(?:\.\d+)?)\s*([KkMm]?)$/);
  if (!match) return 0;
  const [, numText = '', suffixText = ''] = match;
  const num = parseFloat(numText);
  const suffix = suffixText.toUpperCase();
  if (suffix === 'M') return num * 1_000_000;
  if (suffix === 'K') return num * 1_000;
  return num;
}

export function formatSocialDisplayUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

/**
 * Sum followers for a creator's socials, optionally restricted to specific platforms.
 * If platforms is empty or omitted, sums all socials.
 */
export function totalFollowersForCreator(
  socials: Array<{ platform: string; followersDisplay: string }>,
  platforms?: Set<string>,
): number {
  return socials
    .filter((s) => {
      if (!platforms || platforms.size === 0) {
        return true;
      }

      const key = getSocialPlatformKey(s.platform);
      return key ? platforms.has(key) : platforms.has(s.platform);
    })
    .reduce((sum, s) => sum + parseFollowers(s.followersDisplay), 0);
}
