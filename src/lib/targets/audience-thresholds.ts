export const CREATOR_MINIMUM_FOLLOWERS = {
  twitch: 1_000,
  youtube: 3_000,
  kick: 500,
} as const;

export type CreatorAudiencePlatform = keyof typeof CREATOR_MINIMUM_FOLLOWERS;

export function hasMinimumCreatorFollowers(
  platform: CreatorAudiencePlatform,
  followers: number | null | undefined,
): followers is number {
  return followers !== null
    && followers !== undefined
    && Number.isSafeInteger(followers)
    && followers >= CREATOR_MINIMUM_FOLLOWERS[platform];
}

export function shouldShowCreatorTarget(target: Readonly<{
  platform: CreatorAudiencePlatform | 'instagram';
  followers: number | null;
  status: 'pendiente' | 'contactado' | 'finalizado' | 'descartado';
}>): boolean {
  if (target.status !== 'pendiente' || target.platform === 'instagram' || target.followers === null) {
    return true;
  }

  return hasMinimumCreatorFollowers(target.platform, target.followers);
}
