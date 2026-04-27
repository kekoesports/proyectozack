import {
  parseCsvLine,
  parseCsv,
  parseFollowers,
  formatFollowers,
  slugify,
  initialsOf,
  validateMappedRow,
} from '@/lib/utils/import-utils';

// ── parseCsvLine ──────────────────────────────────────────────────────

describe('parseCsvLine', () => {
  it('splits a simple CSV line', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with commas inside', () => {
    expect(parseCsvLine('"John, Jr.",twitch,johndoe')).toEqual(['John, Jr.', 'twitch', 'johndoe']);
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    expect(parseCsvLine('"say ""hi""",foo')).toEqual(['say "hi"', 'foo']);
  });

  it('trims whitespace from cells', () => {
    expect(parseCsvLine(' a , b , c ')).toEqual(['a', 'b', 'c']);
  });

  it('returns single element for a line with no commas', () => {
    expect(parseCsvLine('hello')).toEqual(['hello']);
  });
});

// ── parseCsv ─────────────────────────────────────────────────────────

describe('parseCsv', () => {
  it('parses a minimal CSV with header + 1 row', () => {
    const csv = 'name,slug\nJohn Doe,john-doe';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['name', 'slug']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: 'John Doe', slug: 'john-doe' });
  });

  it('returns empty for empty string', () => {
    const { headers, rows } = parseCsv('');
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  it('skips blank lines', () => {
    const csv = 'name,slug\n\nJohn,john\n\n';
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it('handles CRLF line endings', () => {
    const csv = 'name,slug\r\nJohn,john\r\n';
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: 'John', slug: 'john' });
  });

  it('fills missing cells with empty string', () => {
    const csv = 'name,slug,country\nJohn,john';
    const { rows } = parseCsv(csv);
    expect(rows[0]).toEqual({ name: 'John', slug: 'john', country: '' });
  });
});

// ── parseFollowers ────────────────────────────────────────────────────

describe('parseFollowers', () => {
  it('returns 0 for dash (project invariant)', () => {
    expect(parseFollowers('-')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseFollowers('')).toBe(0);
  });

  it('parses plain integer', () => {
    expect(parseFollowers('180000')).toBe(180000);
  });

  it('parses K suffix', () => {
    expect(parseFollowers('180K')).toBe(180000);
    expect(parseFollowers('1.5K')).toBe(1500);
  });

  it('parses M suffix', () => {
    expect(parseFollowers('1.2M')).toBe(1200000);
    expect(parseFollowers('10M')).toBe(10000000);
  });

  it('is case-insensitive for suffixes', () => {
    expect(parseFollowers('180k')).toBe(180000);
    expect(parseFollowers('1.2m')).toBe(1200000);
  });

  it('strips non-digit characters before parsing', () => {
    expect(parseFollowers('180,000')).toBe(180000);
  });

  it('returns 0 for non-numeric garbage', () => {
    expect(parseFollowers('abc')).toBe(0);
  });
});

// ── formatFollowers ───────────────────────────────────────────────────

describe('formatFollowers', () => {
  it('returns dash for 0', () => {
    expect(formatFollowers(0)).toBe('-');
  });

  it('returns dash for negative', () => {
    expect(formatFollowers(-1)).toBe('-');
  });

  it('formats thousands as K', () => {
    expect(formatFollowers(1500)).toBe('1.5K');
    expect(formatFollowers(10000)).toBe('10K');
  });

  it('formats millions as M', () => {
    expect(formatFollowers(1200000)).toBe('1.2M');
    expect(formatFollowers(10000000)).toBe('10M');
  });

  it('returns plain number for < 1000', () => {
    expect(formatFollowers(500)).toBe('500');
  });
});

// ── slugify ───────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('John Doe')).toBe('john-doe');
  });

  it('removes accents', () => {
    expect(slugify('Ángel García')).toBe('angel-garcia');
  });

  it('removes special characters', () => {
    expect(slugify('hello! world@2024')).toBe('hello-world-2024');
  });

  it('trims leading/trailing dashes', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('truncates to 90 chars', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long)).toHaveLength(90);
  });
});

// ── initialsOf ────────────────────────────────────────────────────────

describe('initialsOf', () => {
  it('returns first letters of first two words', () => {
    expect(initialsOf('John Doe')).toBe('JD');
  });

  it('returns single letter for single word', () => {
    expect(initialsOf('Madonna')).toBe('M');
  });

  it('returns XX for empty string', () => {
    expect(initialsOf('')).toBe('XX');
  });

  it('ignores extra words beyond two', () => {
    expect(initialsOf('John Michael Doe')).toBe('JM');
  });
});

// ── validateMappedRow ─────────────────────────────────────────────────

describe('validateMappedRow', () => {
  const mapping = { nombre: 'name', handle: 'slug', plataforma: 'platform' };

  it('returns valid for a row with name and slug', () => {
    const raw = { nombre: 'John Doe', handle: 'john-doe', plataforma: 'twitch' };
    const result = validateMappedRow(raw, mapping);
    expect(result.valid).toBe(true);
    expect(result.name).toBe('John Doe');
    expect(result.slug).toBe('john-doe');
  });

  it('returns invalid when name is empty', () => {
    const raw = { nombre: '', handle: 'john-doe', plataforma: 'twitch' };
    const result = validateMappedRow(raw, mapping);
    expect(result.valid).toBe(false);
    expect(result.invalidReason).toMatch(/nombre/i);
  });

  it('returns invalid when slug is empty', () => {
    const raw = { nombre: 'John Doe', handle: '', plataforma: 'twitch' };
    const result = validateMappedRow(raw, mapping);
    expect(result.valid).toBe(false);
    expect(result.invalidReason).toMatch(/slug/i);
  });

  it('ignores columns mapped to (ignorar)', () => {
    const mappingWithIgnore = { nombre: 'name', handle: 'slug', extra: '(ignorar)' };
    const raw = { nombre: 'John', handle: 'john', extra: 'should-be-ignored' };
    const result = validateMappedRow(raw, mappingWithIgnore);
    expect(result.valid).toBe(true);
  });

  it('trims whitespace from name and slug', () => {
    const raw = { nombre: '  John  ', handle: '  john  ', plataforma: 'twitch' };
    const result = validateMappedRow(raw, mapping);
    expect(result.valid).toBe(true);
    expect(result.name).toBe('John');
    expect(result.slug).toBe('john');
  });
});

// ── Integration: CSV → mapping → validation ───────────────────────────

describe('CSV import flow integration', () => {
  const csv = [
    'nombre,handle,plataforma,seguidores',
    'John Doe,john-doe,twitch,180000',
    'Jane Smith,jane-smith,youtube,1200000',
    ',no-name,twitch,0',
  ].join('\n');

  const mapping: Record<string, string> = {
    nombre: 'name',
    handle: 'slug',
    plataforma: 'platform',
    seguidores: 'followers',
  };

  it('parses 3 data rows from CSV', () => {
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(3);
  });

  it('validates 2 valid rows and 1 invalid', () => {
    const { rows } = parseCsv(csv);
    const results = rows.map((r) => validateMappedRow(r, mapping));
    const valid = results.filter((r) => r.valid);
    const invalid = results.filter((r) => !r.valid);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.invalidReason).toMatch(/nombre/i);
  });

  it('parseFollowers("-") returns 0 for the invalid row', () => {
    const { rows } = parseCsv(csv);
    const invalidRow = rows[2]!;
    expect(parseFollowers(invalidRow['seguidores'] ?? '')).toBe(0);
  });
});
