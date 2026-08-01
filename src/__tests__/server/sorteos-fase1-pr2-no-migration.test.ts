/**
 * La migración de hardening de sorteos debe existir y estar registrada.
 */

import * as fs from 'fs';
import * as path from 'path';

const DRIZZLE_DIR = path.join(process.cwd(), 'drizzle');

describe('Hardening de integridad de sorteos', () => {
  it('incluye constraints, idempotencia y unicidad en 0112', () => {
    const migration = fs.readFileSync(
      path.join(DRIZZLE_DIR, '0112_sorteos_integrity_hardening.sql'),
      'utf8',
    );
    expect(migration).toMatch(/coin_tx_ref_key_uq/);
    expect(migration).toMatch(/redemptions_request_key_uq/);
    expect(migration).toMatch(/giveaway_winners_giveaway_uq/);
    expect(migration).toMatch(/shop_items_stock_nonnegative_ck/);
  });

  it('el journal registra 0112_sorteos_integrity_hardening', () => {
    const journalPath = path.join(DRIZZLE_DIR, 'meta', '_journal.json');
    const raw = fs.readFileSync(journalPath, 'utf8');
    const parsed = JSON.parse(raw) as { entries?: Array<{ idx: number; tag: string }> };
    expect(parsed.entries ?? []).toEqual(expect.arrayContaining([
      expect.objectContaining({ idx: 112, tag: '0112_sorteos_integrity_hardening' }),
    ]));
  });
});
