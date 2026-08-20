/**
 * Migración 0120 — deduplicación + índice único de evidencias.
 *
 * El orden importa: el CREATE UNIQUE INDEX falla si quedan duplicados, así que
 * los DELETE tienen que ir antes. Si alguien regenera la migración con
 * `drizzle-kit generate`, drizzle emite solo el índice y se pierde la limpieza:
 * estos tests existen para que eso rompa la CI en vez de romper el deploy.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MIGRATION = 'drizzle/0120_smooth_slayback.sql';

describe('Migración 0120 — dedupe + unique index', () => {
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf-8');
  const code = sql.replace(/^\s*--.*$/gm, ''); // sin comentarios

  it('la migración existe', () => {
    expect(fs.existsSync(path.join(ROOT, MIGRATION))).toBe(true);
  });

  it('crea el índice único sobre (tracker_id, normalized_url)', () => {
    expect(code).toMatch(
      /CREATE UNIQUE INDEX "deal_items_tracker_url_uidx" ON "deal_deliverable_items"/i,
    );
    expect(code).toMatch(/"tracker_id","normalized_url"/);
  });

  it('limpia los duplicados ANTES de crear el índice', () => {
    const idxAt = code.search(/CREATE UNIQUE INDEX/i);
    const delAt = code.search(/DELETE FROM/i);
    expect(delAt).toBeGreaterThanOrEqual(0);
    expect(idxAt).toBeGreaterThanOrEqual(0);
    expect(delAt).toBeLessThan(idxAt);
  });

  it('borra el residuo marcado como duplicate', () => {
    expect(code).toMatch(/DELETE FROM "deal_deliverable_items" WHERE "status" = 'duplicate'/i);
  });

  it('conserva la fila más antigua de cada grupo como red de seguridad', () => {
    // El self-join debe borrar la de id MAYOR, nunca la primera.
    expect(code).toMatch(/a\."id" > b\."id"/);
    expect(code).not.toMatch(/a\."id" < b\."id"/);
  });

  it('solo toca deal_deliverable_items', () => {
    const tablas = [...code.matchAll(/(?:DELETE FROM|UPDATE|ALTER TABLE|ON)\s+"([a-z_]+)"/gi)]
      .map((m) => m[1]);
    for (const t of tablas) expect(t).toBe('deal_deliverable_items');
  });

  it('no hace DROP, TRUNCATE ni RENAME', () => {
    expect(code).not.toMatch(/\bDROP\b/i);
    expect(code).not.toMatch(/\bTRUNCATE\b/i);
    expect(code).not.toMatch(/\bRENAME\b/i);
  });
});
