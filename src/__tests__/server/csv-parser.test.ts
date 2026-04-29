import { extractCsvSheet } from '@/lib/parsers/csv';

// ── extractCsvSheet ───────────────────────────────────────────────────

describe('extractCsvSheet', () => {
  // ── edge cases ──────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty headers and rows for empty string', () => {
      const result = extractCsvSheet('');
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('returns headers and empty rows for a single header row with no data', () => {
      const result = extractCsvSheet('Name,Age');
      expect(result.headers).toEqual(['Name', 'Age']);
      expect(result.rows).toEqual([]);
    });

    it('does not produce an extra empty row for a trailing newline', () => {
      const csv = `Name,Age\nAlice,30\n`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Age']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alice', '30']);
    });

    it('handles a single-cell CSV (one header, one data row, one column)', () => {
      const csv = `Title\nHello`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Title']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Hello']);
    });

    it('handles a file with only one column and multiple rows', () => {
      const csv = `Name\nAlice\nBob\nCarol`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name']);
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).toEqual(['Alice']);
      expect(result.rows[1]).toEqual(['Bob']);
      expect(result.rows[2]).toEqual(['Carol']);
    });
  });

  // ── delimiter detection ──────────────────────────────────────────────

  describe('delimiter detection', () => {
    it('parses comma-delimited CSV correctly', () => {
      const csv = `Name,Age,City\nAlice,30,Madrid\nBob,25,Barcelona`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['Alice', '30', 'Madrid']);
      expect(result.rows[1]).toEqual(['Bob', '25', 'Barcelona']);
    });

    it('auto-detects semicolon delimiter and parses correctly', () => {
      const csv = `Name;Age;City\nAlice;30;Madrid\nBob;25;Barcelona`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['Alice', '30', 'Madrid']);
      expect(result.rows[1]).toEqual(['Bob', '25', 'Barcelona']);
    });
  });

  // ── BOM handling ─────────────────────────────────────────────────────

  describe('UTF-8 BOM handling', () => {
    it('strips a leading UTF-8 BOM (\\uFEFF) and parses correctly', () => {
      const csv = `\uFEFFName,Age\nAlice,30`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Age']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alice', '30']);
    });

    it('strips BOM from a semicolon-delimited file', () => {
      const csv = `\uFEFFNombre;Edad\nAlicia;30`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Nombre', 'Edad']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alicia', '30']);
    });
  });

  // ── quoted fields ────────────────────────────────────────────────────

  describe('quoted fields', () => {
    it('treats a quoted field with an embedded comma as a single field', () => {
      const csv = `Name,Tag\n"foo,bar",baz`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Tag']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['foo,bar', 'baz']);
    });

    it('unescapes doubled double-quotes inside a quoted field', () => {
      const csv = `Name,Quote\nAlice,"he said ""hi"""`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Quote']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alice', 'he said "hi"']);
    });

    it('handles mixed quoted and unquoted fields in the same row', () => {
      const csv = `A,B,C\nunquoted,"quoted, with comma",also-unquoted`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['A', 'B', 'C']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['unquoted', 'quoted, with comma', 'also-unquoted']);
    });

    it('handles a quoted field containing a newline character', () => {
      const csv = `Name,Bio\nAlice,"line one\nline two"`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Bio']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alice', 'line one\nline two']);
    });
  });

  // ── line endings ─────────────────────────────────────────────────────

  describe('line endings', () => {
    it('parses CRLF (\\r\\n) line endings the same as LF', () => {
      const csv = `Name,Age\r\nAlice,30\r\nBob,25`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Age']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['Alice', '30']);
      expect(result.rows[1]).toEqual(['Bob', '25']);
    });

    it('handles CRLF with a trailing newline without producing an extra row', () => {
      const csv = `Name,Age\r\nAlice,30\r\n`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Age']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alice', '30']);
    });
  });

  // ── return shape ─────────────────────────────────────────────────────

  describe('return shape', () => {
    it('always returns an object with headers (string[]) and rows (string[][])', () => {
      const result = extractCsvSheet('Col1,Col2\nval1,val2');
      expect(Array.isArray(result.headers)).toBe(true);
      expect(Array.isArray(result.rows)).toBe(true);
      result.headers.forEach((h) => expect(typeof h).toBe('string'));
      result.rows.forEach((row) => {
        expect(Array.isArray(row)).toBe(true);
        (row as string[]).forEach((cell) => expect(typeof cell).toBe('string'));
      });
    });

    it('headers are trimmed of surrounding whitespace', () => {
      const csv = ` Name , Age \nAlice,30`;
      const result = extractCsvSheet(csv);
      expect(result.headers).toEqual(['Name', 'Age']);
    });
  });
});
