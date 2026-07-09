/**
 * Contratos de la migración 0110 (aditiva, no destructiva).
 *
 * La migración solo AÑADE 'preroll' al enum deliverable_type existente.
 * No borra ni renombra nada.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MIGRATION = path.join(ROOT, 'drizzle/0110_add_preroll_to_deliverable_type.sql');
const JOURNAL = path.join(ROOT, 'drizzle/meta/_journal.json');
const SCHEMA = path.join(ROOT, 'src/db/schema/deliverables.ts');

describe('migración 0110 — aditiva, no destructiva', () => {
  it('el archivo SQL existe', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  it('SÓLO usa ALTER TYPE ADD VALUE — nada de DROP/DELETE/RENAME', () => {
    const src = fs.readFileSync(MIGRATION, 'utf-8');
    expect(src).toMatch(/ALTER TYPE .+ADD VALUE .+preroll/i);
    expect(src).not.toMatch(/\bDROP\b/i);
    expect(src).not.toMatch(/\bDELETE\b/i);
    expect(src).not.toMatch(/\bRENAME\b/i);
    expect(src).not.toMatch(/\bTRUNCATE\b/i);
  });

  it('usa IF NOT EXISTS para idempotencia', () => {
    const src = fs.readFileSync(MIGRATION, 'utf-8');
    expect(src).toMatch(/IF NOT EXISTS/i);
  });

  it('el journal referencia la migración con idx 110', () => {
    const journal = JSON.parse(fs.readFileSync(JOURNAL, 'utf-8')) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    const entry = journal.entries.find((e) => e.idx === 110);
    expect(entry).toBeDefined();
    expect(entry?.tag).toBe('0110_add_preroll_to_deliverable_type');
  });

  it('el enum del schema Drizzle incluye preroll', () => {
    const src = fs.readFileSync(SCHEMA, 'utf-8');
    expect(src).toMatch(/pgEnum\(['"]deliverable_type['"][\s\S]+?['"]preroll['"]/);
  });
});
