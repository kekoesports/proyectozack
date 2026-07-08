/**
 * Sorteos Fase 1 PR2 — verificación estática de "sin migración".
 *
 * La PR NO introduce migraciones nuevas. La última migration en el journal
 * debe seguir siendo 0109. Si alguien añade una migration nueva, este
 * test debe actualizarse Y el brief de la PR debe reflejarlo.
 */

import * as fs from 'fs';
import * as path from 'path';

const DRIZZLE_DIR = path.join(process.cwd(), 'drizzle');

describe('Fase 1 PR2 — sin migración nueva', () => {
  it('la última migration en el journal es 0109_*', () => {
    const files = fs.readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith('.sql'));
    const migrations = files
      .filter((f) => /^\d{4}_/.test(f))
      .sort();
    const last = migrations[migrations.length - 1];
    expect(last).toBeDefined();
    expect(last!).toMatch(/^0109_/);
  });

  it('no existe migration 0110 ni 0111', () => {
    const files = fs.readdirSync(DRIZZLE_DIR);
    expect(files.find((f) => f.startsWith('0110_'))).toBeUndefined();
    expect(files.find((f) => f.startsWith('0111_'))).toBeUndefined();
  });

  it('el journal de meta refleja 0109 como último', () => {
    const journalPath = path.join(DRIZZLE_DIR, 'meta', '_journal.json');
    const raw = fs.readFileSync(journalPath, 'utf8');
    const parsed = JSON.parse(raw) as { entries?: Array<{ tag: string }> };
    const entries = parsed.entries ?? [];
    const last = entries[entries.length - 1];
    expect(last).toBeDefined();
    expect(last!.tag).toMatch(/^0109_/);
  });
});
