import type { TwitchLiveStream } from './twitch';
import type { KickLiveCreator } from './kick';
import type { LiveSamplingAccount, NewLiveAudienceSample } from '@/lib/queries/creatorLiveAudienceSamples';
import { isCs2LiveCategory, liveSampleBucket } from '@/lib/targets/live-audience-samples';

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
    if (!account || !isCs2LiveCategory('twitch', stream.gameId, stream.gameName)) return [];
    return [{
      accountId: account.accountId, platform: 'twitch', categoryName: stream.gameName,
      viewerCount: stream.viewerCount, streamStartedAt: stream.startedAt,
      observedAt: liveSampleBucket(context.observedAt), expiresAt: context.expiresAt,
      source: 'twitch:helix:streams',
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
    if (!account || !isCs2LiveCategory('kick', '', stream.category)) return [];
    return [{
      accountId: account.accountId, platform: 'kick', categoryName: stream.category,
      viewerCount: stream.viewerCount, streamStartedAt: stream.startedAt,
      observedAt: liveSampleBucket(context.observedAt), expiresAt: context.expiresAt,
      source: 'kick:public-v2:livestreams',
    }];
  });
}
