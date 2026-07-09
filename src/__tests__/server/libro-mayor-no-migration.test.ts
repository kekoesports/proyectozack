/**
 * Garantiza que la PR 1 NO añade migraciones de DB.
 * La última migración conocida al abrir esta PR debe seguir siendo la misma
 * después de PR 1 — cualquier nueva SQL en `drizzle/` es un red flag.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DRIZZLE_DIR = path.join(ROOT, 'drizzle');

describe('libro-mayor — sin migraciones DB', () => {
  it('drizzle/ existe y contiene migraciones', () => {
    expect(fs.existsSync(DRIZZLE_DIR)).toBe(true);
  });

  it('ninguna migración menciona "libro-mayor", "ledger", "contabilidad" o "accounting"', () => {
    if (!fs.existsSync(DRIZZLE_DIR)) return;
    const files = fs.readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      const src = fs.readFileSync(path.join(DRIZZLE_DIR, f), 'utf-8').toLowerCase();
      expect(src).not.toMatch(/libro[_-]?mayor/);
      expect(src).not.toMatch(/accounting_(ledger|import|reconciliation|account_mapping)/);
      expect(src).not.toMatch(/ledger_entries/);
    }
  });
});
