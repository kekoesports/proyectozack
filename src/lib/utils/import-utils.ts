/**
 * Pure utility functions for CSV/Excel import processing.
 * No DB dependencies — safe to import in tests.
 */

// ── CSV parsing ───────────────────────────────────────────────────────

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += (ch ?? '');
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const [headerLine, ...dataLines] = lines;
  if (!headerLine) return { headers: [], rows: [] };

  const headers = parseCsvLine(headerLine);
  const rows: Record<string, string>[] = [];

  for (const line of dataLines) {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header === undefined) continue;
      row[header] = cells[j] ?? '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

// ── Followers parsing ─────────────────────────────────────────────────

/**
 * Parse a followers string like "180000", "180K", "1.2M", "-" → number.
 * Returns 0 for invalid/dash/empty (project invariant: parseFollowers("-") === 0).
 */
export function parseFollowers(raw: string): number {
  if (!raw || raw.trim() === '-') return 0;
  const s = raw.trim().toUpperCase();
  if (s.endsWith('M')) {
    const n = parseFloat(s.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : 0;
  }
  if (s.endsWith('K')) {
    const n = parseFloat(s.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1000) : 0;
  }
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatFollowers(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '-';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

// ── Slug / initials ───────────────────────────────────────────────────

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('').slice(0, 4) || 'XX';
}

// ── Mapping validation ────────────────────────────────────────────────

export type MappedRowValidation = {
  readonly valid: boolean;
  readonly invalidReason?: string;
  readonly name: string;
  readonly slug: string;
};

/**
 * Validate a single row after applying the column mapping.
 * Returns whether the row is valid and the extracted name/slug.
 */
export function validateMappedRow(
  raw: Record<string, string>,
  mapping: Record<string, string>,
): MappedRowValidation {
  const mapped: Record<string, string> = {};
  for (const [csvHeader, talentField] of Object.entries(mapping)) {
    if (talentField && talentField !== '(ignorar)') {
      mapped[talentField] = raw[csvHeader] ?? '';
    }
  }

  const name = (mapped['name'] ?? '').trim();
  const slug = (mapped['slug'] ?? '').trim();

  if (!name) return { valid: false, invalidReason: 'Nombre vacío', name, slug };
  if (!slug) return { valid: false, invalidReason: 'Slug vacío', name, slug };

  return { valid: true, name, slug };
}
