/**
 * ISO week utilities anchored to Europe/Madrid so "what week is it" matches
 * the team's local perception (a Sunday 23:30 Madrid task belongs to this week,
 * not next week's UTC shift).
 */

const WEEK_LABEL_RE = /^(\d{4})-W(\d{2})$/;

function madridCivilDate(instant: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const day = Number(parts.find((p) => p.type === 'day')!.value);
  return { year, month, day };
}

function isoWeekOfUtcDate(utcDate: Date): { isoYear: number; week: number } {
  // Thursday of the current ISO week defines the ISO year.
  const dayNum = (utcDate.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const thursday = new Date(utcDate);
  thursday.setUTCDate(utcDate.getUTCDate() - dayNum + 3);
  const isoYear = thursday.getUTCFullYear();

  // Monday of ISO week 1 is the Monday of the week containing Jan 4.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNum = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum);

  const diffDays = Math.floor((thursday.getTime() - week1Monday.getTime()) / 86_400_000);
  const week = Math.floor(diffDays / 7) + 1;
  return { isoYear, week };
}

export function getIsoWeekLabel(date: Date): string {
  const { year, month, day } = madridCivilDate(date);
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  const { isoYear, week } = isoWeekOfUtcDate(asUtc);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export function parseWeekLabel(label: string): { readonly year: number; readonly week: number } {
  const match = WEEK_LABEL_RE.exec(label);
  if (!match) throw new Error(`Invalid week label: ${label}`);
  return { year: Number(match[1]), week: Number(match[2]) };
}

/**
 * Returns the Monday 00:00 Madrid instant (as a Date) for a given week label.
 * Useful for display formatting and rendering "Sem. W17 · 20 Apr" style headers.
 */
export function getWeekStart(label: string): Date {
  const { year, week } = parseWeekLabel(label);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4DayNum = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  // Madrid offset varies (DST). Compute it from the Monday noon instant.
  const noonUtc = new Date(monday);
  noonUtc.setUTCHours(12);
  const madridParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(noonUtc);
  const madridHour = Number(madridParts.find((p) => p.type === 'hour')!.value);
  const offsetHours = madridHour - 12; // +1 winter, +2 summer
  // Monday 00:00 Madrid = Monday (-offsetHours) UTC
  const result = new Date(monday);
  result.setUTCHours(-offsetHours, 0, 0, 0);
  return result;
}

export function getWeekEnd(label: string): Date {
  const start = getWeekStart(label);
  return new Date(start.getTime() + 7 * 86_400_000 - 1);
}

export function previousWeek(label: string): string {
  const start = getWeekStart(label);
  const prev = new Date(start.getTime() - 86_400_000); // one day earlier = previous week
  return getIsoWeekLabel(prev);
}

export function nextWeek(label: string): string {
  const start = getWeekStart(label);
  const next = new Date(start.getTime() + 8 * 86_400_000); // jump past Sunday
  return getIsoWeekLabel(next);
}
