/**
 * Migración 0111 — validaciones estáticas.
 *
 * La migración debe ser puramente aditiva:
 *   - Solo ADD COLUMN.
 *   - Todas las columnas nullable.
 *   - Ninguna FK.
 *   - Sin ALTER, DROP, RENAME.
 *   - IF NOT EXISTS para idempotencia.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MIGRATION = 'drizzle/0111_add_tracking_sheet_to_campaigns.sql';

describe('Migración 0111 — aditiva y no destructiva', () => {
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf-8');

  it('la migración existe en drizzle/', () => {
    expect(fs.existsSync(path.join(ROOT, MIGRATION))).toBe(true);
  });

  it('solo contiene ADD COLUMN — sin DROP, ALTER TYPE, RENAME ni TRUNCATE', () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bALTER TYPE\b/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\b/i);
    expect(sql).not.toMatch(/\bUPDATE\b/i);
  });

  it('todas las sentencias son ADD COLUMN con IF NOT EXISTS', () => {
    const alterStmts = sql.match(/ALTER TABLE[\s\S]+?;/g) ?? [];
    expect(alterStmts.length).toBeGreaterThan(0);
    for (const stmt of alterStmts) {
      expect(stmt).toMatch(/ADD COLUMN IF NOT EXISTS/i);
    }
  });

  it('ninguna columna añade FK', () => {
    expect(sql).not.toMatch(/REFERENCES/i);
  });

  it('ninguna columna añade NOT NULL', () => {
    // Las 5 columnas son todas NULLABLE.
    expect(sql).not.toMatch(/NOT NULL/i);
  });

  it('añade exactamente 5 columnas esperadas', () => {
    expect(sql).toMatch(/"tracking_sheet_url"/);
    expect(sql).toMatch(/"tracking_sheet_spreadsheet_id"/);
    expect(sql).toMatch(/"tracking_sheet_gid"/);
    expect(sql).toMatch(/"last_tracking_sync_at"/);
    expect(sql).toMatch(/"tracking_sync_error"/);
  });

  it('afecta solo a la tabla campaigns', () => {
    const tables = sql.match(/ALTER TABLE\s+"?(\w+)"?/gi) ?? [];
    for (const t of tables) {
      expect(t).toMatch(/campaigns/i);
    }
  });

  it('journal registra idx 111 con tag correcto', () => {
    const journal = fs.readFileSync(path.join(ROOT, 'drizzle/meta/_journal.json'), 'utf-8');
    const parsed = JSON.parse(journal) as { entries: Array<{ idx: number; tag: string }> };
    const entry = parsed.entries.find((e) => e.idx === 111);
    expect(entry).toBeDefined();
    expect(entry?.tag).toBe('0111_add_tracking_sheet_to_campaigns');
  });
});
