/** Serializable, scoped observations. Null is unavailable, never an observed zero. */
export type StudioMetricPoint = {
  socialId: number;
  platform: string;
  date: string;
  followers: number | null;
  views: number | null;
  source: string;
};

export function studioPlatformName(platform: string) {
  const names: Record<string, string> = {
    yt: 'YouTube', youtube: 'YouTube', tw: 'Twitch', twitch: 'Twitch',
    ig: 'Instagram', instagram: 'Instagram', tk: 'TikTok', tiktok: 'TikTok', x: 'X',
  };
  return names[platform] ?? platform;
}

export function studioMetricSeries(
  points: StudioMetricPoint[], socialId: number, days: number, today: string,
) {
  const end = Date.parse(`${today}T00:00:00Z`);
  const start = end - (days - 1) * 86_400_000;
  return points.filter((point) => {
    const day = Date.parse(`${point.date}T00:00:00Z`);
    return point.socialId === socialId && day >= start && day <= end;
  }).toSorted((a, b) => a.date.localeCompare(b.date));
}

export function studioMetricDelta(points: StudioMetricPoint[]) {
  const first = points[0]?.followers;
  const last = points.at(-1)?.followers;
  if (points.length < 2 || first == null || last == null) return null;
  return { absolute: last - first, percent: first === 0 ? null : (last - first) / first * 100 };
}

export function studioLatestChannels(points: StudioMetricPoint[]) {
  const latest = new Map<number, StudioMetricPoint>();
  for (const point of points) {
    const previous = latest.get(point.socialId);
    if (!previous || previous.date < point.date) latest.set(point.socialId, point);
  }
  return [...latest.values()];
}
