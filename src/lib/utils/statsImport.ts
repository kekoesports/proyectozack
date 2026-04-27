/**
 * Pure logic for parsing stats import sheets and matching against the roster.
 *
 * - Accepts the JSON output of XLSX.utils.sheet_to_json (`Record<string, unknown>[]`).
 * - Normalises common column-name variants (case/accents/aliases).
 * - Returns a typed list of rows ready for the diff/preview UI.
 */

export type ParsedImportRow = {
  readonly rowIndex: number;
  readonly talentName: string;
  readonly platform: string;
  readonly handle: string | null;
  readonly profileUrl: string | null;
  readonly followersDisplay: string | null;
  readonly avgViewers: number | null;
};

export type CurrentSocial = {
  readonly id: number;
  readonly talentId: number;
  readonly platform: string;
  readonly handle: string;
  readonly followersDisplay: string;
  readonly profileUrl: string | null;
  readonly avgViewers: number | null;
};

export type CurrentTalent = {
  readonly id: number;
  readonly name: string;
  readonly socials: readonly CurrentSocial[];
};

export type DiffRow = {
  readonly rowIndex: number;
  readonly parsed: ParsedImportRow;
  readonly status: 'new' | 'updated' | 'unchanged' | 'no-talent-match' | 'no-social-match';
  readonly talentId: number | null;
  readonly socialId: number | null;
  readonly current: {
    readonly handle: string | null;
    readonly followersDisplay: string | null;
    readonly profileUrl: string | null;
    readonly avgViewers: number | null;
  } | null;
  readonly changes: ReadonlyArray<{ readonly field: string; readonly before: string | null; readonly after: string | null }>;
};

const HEADER_ALIASES: Record<string, string> = {
  talent: 'talentName',
  creator: 'talentName',
  creador: 'talentName',
  nombre: 'talentName',
  name: 'talentName',
  red: 'platform',
  network: 'platform',
  plataforma: 'platform',
  platform: 'platform',
  handle: 'handle',
  usuario: 'handle',
  username: 'handle',
  'profile url': 'profileUrl',
  'profile_url': 'profileUrl',
  url: 'profileUrl',
  perfil: 'profileUrl',
  link: 'profileUrl',
  followers: 'followersDisplay',
  seguidores: 'followersDisplay',
  subs: 'followersDisplay',
  subscribers: 'followersDisplay',
  followers_display: 'followersDisplay',
  ccv: 'avgViewers',
  'avg viewers': 'avgViewers',
  'avg_viewers': 'avgViewers',
  viewers: 'avgViewers',
};

function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[\s_-]+/g, ' ');
}

function normaliseString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function normalisePlatform(v: unknown): string {
  if (v == null) return '';
  return String(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function normaliseTalentName(v: unknown): string {
  if (v == null) return '';
  return String(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function toNumberOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Map a single sheet row using header aliases. Returns null if the row has no
 * talent name (treated as a separator/blank row).
 */
export function mapRow(rawRow: Record<string, unknown>, rowIndex: number): ParsedImportRow | null {
  const mapped: Partial<Record<keyof ParsedImportRow, unknown>> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const norm = normaliseHeader(key);
    const target = HEADER_ALIASES[norm];
    if (!target) continue;
    mapped[target as keyof ParsedImportRow] = value;
  }

  const talentName = normaliseString(mapped.talentName);
  if (!talentName) return null;

  const platform = normalisePlatform(mapped.platform);
  if (!platform) return null;

  return {
    rowIndex,
    talentName,
    platform,
    handle: normaliseString(mapped.handle),
    profileUrl: normaliseString(mapped.profileUrl),
    followersDisplay: normaliseString(mapped.followersDisplay),
    avgViewers: toNumberOrNull(mapped.avgViewers),
  };
}

export function parseSheetRows(rawRows: ReadonlyArray<Record<string, unknown>>): readonly ParsedImportRow[] {
  const out: ParsedImportRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r) continue;
    const mapped = mapRow(r, i + 2); // +2 so it matches user-visible row number (header is row 1)
    if (mapped) out.push(mapped);
  }
  return out;
}

/** Compare a parsed row against the current roster, producing diff metadata. */
export function diffAgainstRoster(parsed: readonly ParsedImportRow[], roster: readonly CurrentTalent[]): readonly DiffRow[] {
  const byName = new Map<string, CurrentTalent>();
  for (const t of roster) byName.set(normaliseTalentName(t.name), t);

  const out: DiffRow[] = [];
  for (const row of parsed) {
    const talent = byName.get(normaliseTalentName(row.talentName)) ?? null;
    if (!talent) {
      out.push({
        rowIndex: row.rowIndex,
        parsed: row,
        status: 'no-talent-match',
        talentId: null,
        socialId: null,
        current: null,
        changes: [],
      });
      continue;
    }

    const social = talent.socials.find((s) => normalisePlatform(s.platform) === row.platform) ?? null;
    if (!social) {
      out.push({
        rowIndex: row.rowIndex,
        parsed: row,
        status: 'new',
        talentId: talent.id,
        socialId: null,
        current: null,
        changes: collectChanges(null, row),
      });
      continue;
    }

    const current = {
      handle: social.handle,
      followersDisplay: social.followersDisplay,
      profileUrl: social.profileUrl,
      avgViewers: social.avgViewers,
    };
    const changes = collectChanges(current, row);
    out.push({
      rowIndex: row.rowIndex,
      parsed: row,
      status: changes.length > 0 ? 'updated' : 'unchanged',
      talentId: talent.id,
      socialId: social.id,
      current,
      changes,
    });
  }
  return out;
}

function collectChanges(
  current: { handle: string | null; followersDisplay: string | null; profileUrl: string | null; avgViewers: number | null } | null,
  parsed: ParsedImportRow,
): ReadonlyArray<{ readonly field: string; readonly before: string | null; readonly after: string | null }> {
  const changes: { field: string; before: string | null; after: string | null }[] = [];
  const fields: ReadonlyArray<['handle' | 'followersDisplay' | 'profileUrl' | 'avgViewers', string]> = [
    ['handle', 'Handle'],
    ['followersDisplay', 'Followers'],
    ['profileUrl', 'URL perfil'],
    ['avgViewers', 'CCV / Avg viewers'],
  ];
  for (const [key, label] of fields) {
    const incoming = parsed[key];
    if (incoming === null || incoming === undefined) continue;
    const before = current ? current[key] : null;
    const beforeStr = before === null || before === undefined ? null : String(before);
    const afterStr = String(incoming);
    if (beforeStr !== afterStr) {
      changes.push({ field: label, before: beforeStr, after: afterStr });
    }
  }
  return changes;
}
