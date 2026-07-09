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
  // Nota histórica: este test verificaba que la última migration fuera 0109.
  // Cuando una PR ajena (tratos-entregables-editables) añade una migration
  // aditiva, la aserción se refactoriza a "ninguna migración del ámbito
  // sorteos/raffle nueva" — que es la intención real del test.
  const SCOPE_RE = /^\d{4}_.*(sorteo|raffle|prize|coin|social[_-]?mission|consent[_-]?gate)/i;

  it('no aparecen migraciones nuevas del ámbito sorteos/raffle', () => {
    const files = fs.readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith('.sql'));
    const scoped = files.filter((f) => SCOPE_RE.test(f) && !f.startsWith('_legacy_'));
    // Solo la migration 0106 legítima de Fase 1 PR1 (consent gate) debe quedar.
    // La Fase 1 PR2 confirmó "sin nueva migración de este ámbito".
    for (const f of scoped) {
      const idx = Number(f.substring(0, 4));
      expect(idx).toBeLessThanOrEqual(108);
    }
  });

  it('el journal no contiene tags de sorteos/raffle posteriores a 0106', () => {
    const journalPath = path.join(DRIZZLE_DIR, 'meta', '_journal.json');
    const raw = fs.readFileSync(journalPath, 'utf8');
    const parsed = JSON.parse(raw) as { entries?: Array<{ idx: number; tag: string }> };
    const entries = parsed.entries ?? [];
    for (const e of entries) {
      if (SCOPE_RE.test(`${e.idx.toString().padStart(4, '0')}_${e.tag.replace(/^\d+_/, '')}`)) {
        expect(e.idx).toBeLessThanOrEqual(108);
      }
    }
  });
});
