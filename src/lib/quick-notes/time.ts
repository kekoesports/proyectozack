export function civilDate(now: Date, timezone = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function addCivilDays(date: string, days: number): string {
  const result = new Date(date + 'T12:00:00Z');
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
/** Reject nonexistent/ambiguous local times instead of silently shifting a reminder across DST. */
export function madridInstant(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const timestamp = Date.parse(local + ':00Z');
  if (!Number.isFinite(timestamp)) return null;
  const matches: string[] = [];
  for (const hours of [1, 2]) {
    const candidate = new Date(timestamp - hours * 3_600_000);
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .format(candidate)
      .replace(' ', 'T');
    if (parts === local) matches.push(candidate.toISOString());
  }
  return matches.length === 1 ? (matches[0] ?? null) : null;
}
export function inNoticeHours(
  now: Date,
  settings: { startHour: number; endHour: number; weekdaysOnly: boolean },
): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  );
  const weekday = new Date(civilDate(now) + 'T12:00:00Z').getUTCDay();
  return (
    hour >= settings.startHour &&
    hour < settings.endHour &&
    (!settings.weekdaysOnly || (weekday > 0 && weekday < 6))
  );
}
