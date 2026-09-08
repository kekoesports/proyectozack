export const CREATOR_MINIMUM_FOLLOWERS = {
  twitch: 10_000,
  youtube: 3_000,
  kick: 2_000,
} as const;

export const CREATOR_FOLLOWER_THRESHOLD_IS_EXCLUSIVE = {
  twitch: true,
  youtube: false,
  kick: true,
} as const;

export type CreatorAudiencePlatform = keyof typeof CREATOR_MINIMUM_FOLLOWERS;

export function hasMinimumCreatorFollowers(
  platform: CreatorAudiencePlatform,
  followers: number | null | undefined,
): boolean {
  return followers !== null
    && followers !== undefined
    && Number.isSafeInteger(followers)
    && (CREATOR_FOLLOWER_THRESHOLD_IS_EXCLUSIVE[platform]
      ? followers > CREATOR_MINIMUM_FOLLOWERS[platform]
      : followers >= CREATOR_MINIMUM_FOLLOWERS[platform]);
}

export function shouldShowCreatorTarget(target: Readonly<{
  platform: CreatorAudiencePlatform | 'instagram';
  followers: number | null;
  qualificationStatus?: string | null;
  status: 'pendiente' | 'contactado' | 'finalizado' | 'descartado';
}>): boolean {
  if (target.status !== 'pendiente' || target.platform === 'instagram') {
    return true;
  }

  return hasMinimumCreatorFollowers(target.platform, target.followers)
    && (target.platform !== 'twitch' || target.qualificationStatus === 'qualified');
}
