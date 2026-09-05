import { KickCategories, KickChannels, KickLivestreams, KickSlug } from '@/lib/schemas/kick-discovery';

const category = { id: 12, name: 'Counter-Strike 2' };
const livestream = {
  broadcaster_user: { id: 100, username: 'Synthetic Creator', profile_picture: null },
  category, channel: { slug: 'streamer-123' }, language_code: 'es',
  started_at: '2026-01-01T10:00:00Z', title: 'Synthetic CS2', viewer_count: 20,
};

it('accepts the documented hyphenated channel slug and retains normalization', () => {
  expect(KickSlug.safeParse('STREAMER-123')).toEqual({ success: true, data: 'streamer-123' });
  expect(KickChannels.safeParse({ data: [{ broadcaster_user_id: 100, slug: 'streamer-123' }] }).success).toBe(true);
  expect(KickLivestreams.safeParse({ data: [livestream], pagination: { next_cursor: '' } }).success).toBe(true);
});

it.each(['', '../private', 'streamer/name', 'streamer\\name', 'streamer?token=value', 'streamer#fragment',
  'streamer@example.org', 'streamer name', 'x'.repeat(26)])('still rejects unsafe or oversized slug %s', value => {
  expect(KickSlug.safeParse(value).success).toBe(false);
});

it.each(['', null, undefined, 'next-cursor'])('accepts compatible end/continuation cursor %s', next_cursor => {
  const pagination = { next_cursor };
  expect(KickCategories.safeParse({ data: [category], pagination }).success).toBe(true);
  expect(KickLivestreams.safeParse({ data: [livestream], pagination }).success).toBe(true);
});

it.each([0, false, [], {}, 'x'.repeat(2001)])('rejects malformed or oversized cursor %#', next_cursor => {
  const pagination = { next_cursor };
  expect(KickCategories.safeParse({ data: [category], pagination }).success).toBe(false);
  expect(KickLivestreams.safeParse({ data: [livestream], pagination }).success).toBe(false);
});

it('does not mask missing identity or invalid metrics while accepting empty pagination', () => {
  expect(KickCategories.safeParse({ data: [{ name: category.name }], pagination: { next_cursor: '' } }).success).toBe(false);
  expect(KickLivestreams.safeParse({ data: [{ ...livestream, viewer_count: null }],
    pagination: { next_cursor: '' } }).success).toBe(false);
});
