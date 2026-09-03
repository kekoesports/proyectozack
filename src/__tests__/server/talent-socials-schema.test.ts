import {
  TALENT_PROFILE_SOCIAL_PLATFORM_VALUES,
  TalentProfileSocialPlatformSchema,
  TalentSocialsUpdateSchema,
} from '@/lib/schemas/talentSocials';

describe('talent social validation', () => {
  it('accepts every platform offered by the profile editor', () => {
    expect(TALENT_PROFILE_SOCIAL_PLATFORM_VALUES).toContain('discord');

    for (const platform of TALENT_PROFILE_SOCIAL_PLATFORM_VALUES) {
      expect(TalentProfileSocialPlatformSchema.safeParse(platform).success).toBe(true);
    }
  });

  it('accepts Discord invite and YouTube channel rows together', () => {
    const result = TalentSocialsUpdateSchema.safeParse({
      talentId: 83,
      entries: [
        {
          platform: 'discord',
          handle: '6mkv82J',
          profileUrl: 'https://discord.com/invite/6mkv82J',
          followersDisplay: '-',
          sortOrder: 1,
        },
        {
          platform: 'youtube',
          handle: 'imanXTRA',
          profileUrl: 'https://www.youtube.com/@imanXTRA',
          followersDisplay: '10K',
          sortOrder: 2,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsupported platforms and invalid row identifiers', () => {
    expect(TalentSocialsUpdateSchema.safeParse({
      talentId: 83,
      entries: [{ id: -1, platform: 'facebook', handle: 'creator' }],
    }).success).toBe(false);
  });
});
