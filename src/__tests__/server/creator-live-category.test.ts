import { liveCategoryQueries, matchesLiveCategory, matchesTwitchCategory, twitchCategoryQuery } from '@/lib/targets/live-category';
import { creatorSearchProfileSchema, DEFAULT_CREATOR_SEARCH_PROFILE } from '@/lib/schemas/creator-search-profile';

it('deduplicates campaign keywords to a single exact CS2 category before spending quota', () => {
  expect(liveCategoryQueries(DEFAULT_CREATOR_SEARCH_PROFILE.keywords)).toEqual(['Counter-Strike 2']);
  expect(twitchCategoryQuery('Counter-Strike 2')).toBe('Counter-Strike');
});
it('does not broaden other games or include Source/1.6 through substring matching', () => {
  expect(liveCategoryQueries(['VALORANT', 'Valorant', 'Counter-Strike: Source'])).toEqual(['Valorant', 'Counter-Strike: Source']);
  expect(matchesLiveCategory('Counter-Strike: Source', 'Counter-Strike 2')).toBe(false);
  expect(matchesLiveCategory('Counter-Strike 1.6', 'Counter-Strike 2')).toBe(false);
  expect(matchesLiveCategory('Counter-Strike 2', 'Counter-Strike 2')).toBe(true);
  expect(matchesLiveCategory('VALORANT', 'Valorant')).toBe(true);
});
it('requires the verified Twitch game identity for its legacy Counter-Strike label', () => {
  expect(matchesTwitchCategory({ id: '32399', name: 'Counter-Strike' }, 'Counter-Strike 2')).toBe(true);
  expect(matchesTwitchCategory({ id: '32399', name: 'Counter-Strike 2' }, 'Counter-Strike 2')).toBe(true);
  expect(matchesTwitchCategory({ id: '10710', name: 'Counter-Strike 1.6' }, 'Counter-Strike 2')).toBe(false);
  expect(matchesTwitchCategory({ id: 'other', name: 'Counter-Strike' }, 'Counter-Strike 2')).toBe(false);
  expect(matchesTwitchCategory({ id: '32399', name: 'Source' }, 'Counter-Strike 2')).toBe(false);
});
it('parses old saved profiles with a conservative configurable live minimum', () => {
  const { minLiveViewers: _minimum, ...legacy } = DEFAULT_CREATOR_SEARCH_PROFILE;
  expect(creatorSearchProfileSchema.parse(legacy).minLiveViewers).toBe(20);
  expect(creatorSearchProfileSchema.parse({ ...legacy, minLiveViewers: 57 }).minLiveViewers).toBe(57);
  expect(creatorSearchProfileSchema.safeParse({ ...legacy, minLiveViewers: -1 }).success).toBe(false);
});
