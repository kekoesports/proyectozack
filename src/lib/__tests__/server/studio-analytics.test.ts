import { studioLatestChannels, studioMetricDelta, studioMetricSeries, type StudioMetricPoint } from '@/lib/studio/analytics';

function point(date: string, followers: number | null, socialId = 1): StudioMetricPoint {
  return { date, followers, socialId, platform: 'youtube', source: 'isolated fixture', views: null };
}
test('seven-day window includes exactly seven dates and excludes future observations', () => {
  const rows = [point('2026-08-30', 1), point('2026-08-31', 2), point('2026-09-06', 3), point('2026-09-07', 4), point('2026-09-06', 8, 2)];
  expect(studioMetricSeries(rows, 1, 7, '2026-09-06').map((row) => row.followers)).toEqual([2, 3]);
});
test('channels are not aggregated or confused; unordered input picks the latest date', () => {
  expect(studioLatestChannels([point('2026-09-06', 8, 2), point('2026-09-06', 3), point('2026-09-05', 2)]).map((row) => row.followers)).toEqual([8, 3]);
});
test('missing observations do not manufacture growth', () => {
  expect(studioMetricDelta([])).toBeNull();
  expect(studioMetricDelta([point('2026-09-06', 0)])).toBeNull();
  expect(studioMetricDelta([point('2026-09-05', null), point('2026-09-06', 5)])).toBeNull();
});
test('valid zero is retained but percentage from zero is undefined', () => {
  expect(studioMetricDelta([point('2026-09-05', 0), point('2026-09-06', 5)])).toEqual({ absolute: 5, percent: null });
  expect(studioMetricDelta([point('2026-09-05', 10), point('2026-09-06', 0)])).toEqual({ absolute: -10, percent: -100 });
});
