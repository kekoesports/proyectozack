import { createTargetSchema } from '@/lib/schemas/target';
import type { PlatformValue } from './targets-constants';

/** Empty selection means all platforms; a missing/invalid URL defaults to YouTube. */
export function readTargetPlatforms(params: Pick<URLSearchParams, 'getAll'>): PlatformValue[] {
  const values = params.getAll('platforms');
  if (values.length !== 1) return ['youtube'];
  if (values[0] === 'all') return [];
  const parsed = createTargetSchema.shape.platform.array().min(1).max(4).safeParse(values[0]?.split(','));
  return parsed.success ? [...new Set(parsed.data)] : ['youtube'];
}

export function toggleTargetPlatform(platforms: readonly PlatformValue[], platform: PlatformValue): PlatformValue[] {
  return platforms.includes(platform)
    ? platforms.filter((item) => item !== platform)
    : [...platforms, platform];
}
