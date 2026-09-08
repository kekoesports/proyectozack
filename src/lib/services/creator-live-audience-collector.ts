import type { TwitchLiveStream } from './twitch';
import type { KickLiveCreator } from './kick';
import type { LiveSamplingAccount, NewLiveAudienceSample } from '@/lib/queries/creatorLiveAudienceSamples';
import { ALL_CATEGORY_SAMPLE_SOURCE_SUFFIX, isCs2LiveCategory, liveSampleBucket } from '@/lib/targets/live-audience-samples';

type SampleContext = Readonly<{
  observedAt: Date;
  expiresAt: Date;
}>;

export function twitchAudienceSamples(
  accounts: readonly LiveSamplingAccount[], streams: readonly TwitchLiveStream[], context: SampleContext,
): NewLiveAudienceSample[] {
  const byExternalId = new Map(accounts.map(account => [account.externalId, account]));
  const byUsername = new Map(accounts.map(account => [account.username.toLowerCase(), account]));
  return streams.flatMap(stream => {
    const account = byExternalId.get(stream.userId) ?? byUsername.get(stream.userLogin.toLowerCase());
    if (!account) return [];
    const categoryName = isCs2LiveCategory('twitch', stream.gameId, stream.gameName)
      ? 'Counter-Strike 2' : stream.gameName;
    return [{
      accountId: account.accountId, platform: 'twitch', categoryName,
      viewerCount: stream.viewerCount, streamStartedAt: stream.startedAt,
      observedAt: liveSampleBucket(context.observedAt), expiresAt: context.expiresAt,
      source: `twitch:helix:streams${ALL_CATEGORY_SAMPLE_SOURCE_SUFFIX}`,
    }];
  });
}

export function kickAudienceSamples(
  accounts: readonly LiveSamplingAccount[], streams: readonly KickLiveCreator[], context: SampleContext,
): NewLiveAudienceSample[] {
  const byExternalId = new Map(accounts.map(account => [account.externalId, account]));
  const byUsername = new Map(accounts.map(account => [account.username.toLowerCase(), account]));
  return streams.flatMap(stream => {
    const account = byExternalId.get(String(stream.userId)) ?? byUsername.get(stream.slug.toLowerCase());
    if (!account) return [];
    const categoryName = isCs2LiveCategory('kick', '', stream.category)
      ? 'Counter-Strike 2' : stream.category;
    return [{
      accountId: account.accountId, platform: 'kick', categoryName,
      viewerCount: stream.viewerCount, streamStartedAt: stream.startedAt,
      observedAt: liveSampleBucket(context.observedAt), expiresAt: context.expiresAt,
      source: `kick:public-v2:livestreams${ALL_CATEGORY_SAMPLE_SOURCE_SUFFIX}`,
    }];
  });
}
