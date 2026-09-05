/** Keyword campaigns share a single official category lookup; no substring category admission. */
export function liveCategoryQueries(keywords: readonly string[]): string[] {
  const result = new Map<string, string>();
  for (const keyword of keywords) {
    const key = normalizeCategory(keyword);
    const canonical = /^(cs ?2|counter strike 2)( |$)/.test(key) || key === 'counter strike'
      ? 'Counter-Strike 2' : keyword.trim();
    result.set(normalizeCategory(canonical), canonical);
  }
  return [...result.values()];
}

export function matchesLiveCategory(actual: string, requested: string): boolean {
  return normalizeCategory(actual) === normalizeCategory(requested);
}

/** Official Helix category lookup verified 2026-09-05; CS2 uses legacy label Counter-Strike. */
export function matchesTwitchCategory(category: Readonly<{ id: string; name: string }>, requested: string): boolean {
  if (normalizeCategory(requested) === 'counter strike 2') {
    return category.id === '32399' && ['counter strike', 'counter strike 2'].includes(normalizeCategory(category.name));
  }
  return matchesLiveCategory(category.name, requested);
}

export function twitchCategoryQuery(category: string): string {
  return normalizeCategory(category) === 'counter strike 2' ? 'Counter-Strike' : category;
}

function normalizeCategory(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
