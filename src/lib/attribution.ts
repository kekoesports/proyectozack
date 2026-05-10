const STORAGE_KEY = 'sp-attribution';

const TRACKED_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'creator',
] as const;

type TrackedParam = (typeof TRACKED_PARAMS)[number];

export type Attribution = Partial<Record<TrackedParam, string>>;

export function captureAttributionFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const next: Attribution = {};
  for (const p of TRACKED_PARAMS) {
    const v = params.get(p);
    if (v && v.length > 0 && v.length <= 200) next[p] = v;
  }
  if (Object.keys(next).length === 0) return;
  try {
    const prev = getStoredAttribution();
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prev, ...next }),
    );
  } catch {
    // sessionStorage cuota/seguridad — silencioso
  }
}

export function getStoredAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Attribution;
    }
    return {};
  } catch {
    return {};
  }
}
