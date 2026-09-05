export type CreatorApiBudget = Readonly<{ platform: string; bucketDay: string; globalLimit: number; profileLimit: number }>;

/** Internal conservative ceilings, not a statement of this project's provider quota. */
export function creatorApiBudget(urlWithoutQuery: string, searchPagesPerDay: number, now: Date): CreatorApiBudget {
  const url = new URL(urlWithoutQuery);
  let platform: string, globalLimit: number, profileLimit: number, timezone = 'UTC';
  if (url.hostname === 'www.googleapis.com' && url.pathname.startsWith('/youtube/v3/')) {
    const search = url.pathname === '/youtube/v3/search';
    platform = search ? 'youtube:search' : 'youtube:read';
    globalLimit = search ? 50 : 5000;
    profileLimit = search ? Math.min(20, Math.max(1, Math.floor(searchPagesPerDay))) : 1000;
    timezone = 'America/Los_Angeles';
  } else if (['api.twitch.tv', 'id.twitch.tv'].includes(url.hostname)) {
    platform = 'twitch:read'; globalLimit = 5000; profileLimit = 400;
  } else if (['api.kick.com', 'id.kick.com'].includes(url.hostname)) {
    platform = 'kick:read'; globalLimit = 5000; profileLimit = 400;
  } else if (['graph.facebook.com', 'graph.instagram.com'].includes(url.hostname)) {
    platform = 'instagram:read'; globalLimit = 200; profileLimit = 200;
  } else throw new Error('creator_budget_unknown_provider');
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string): string => parts.find((item) => item.type === type)?.value ?? '';
  return { platform, bucketDay: `${part('year')}-${part('month')}-${part('day')}`, globalLimit, profileLimit };
}
