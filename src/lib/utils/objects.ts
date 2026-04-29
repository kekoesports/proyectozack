/**
 * Strip keys whose value is `undefined`.
 * Required for `exactOptionalPropertyTypes` — Drizzle update queries reject
 * explicit `undefined` values that are meant to be omitted.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Replace `undefined` values with `null`.
 * Use when inserting a new row where every column must have an explicit value
 * (e.g., Drizzle `insert().values(...)` with non-nullable columns).
 */
export function nullify<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === undefined ? null : v;
  }
  return out;
}
