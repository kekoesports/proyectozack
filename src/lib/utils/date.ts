/**
 * Date utilities — keep all date↔string conversions consistent.
 *
 * Why this exists: `Date#toISOString()` always serialises in UTC, so
 * `new Date(2026, 0, 1).toISOString().slice(0, 10)` returns `"2025-12-31"`
 * in any timezone east of UTC (e.g. Madrid GMT+1 in winter). Our app uses
 * local "calendar dates" (no time component), so we must build the
 * `YYYY-MM-DD` string from the *local* fields of the Date instead.
 */

/** Format a Date as `YYYY-MM-DD` using its **local** Y/M/D fields. */
export function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today as `YYYY-MM-DD` in the local timezone. */
export function todayLocalIso(): string {
  return toLocalIsoDate(new Date());
}

/** January 1st of `date`'s local year, formatted as `YYYY-MM-DD`. */
export function startOfLocalYearIso(date: Date = new Date()): string {
  return toLocalIsoDate(new Date(date.getFullYear(), 0, 1));
}
