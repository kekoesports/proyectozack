/**
 * El `when` de la última migración debe superar al de todas las anteriores.
 *
 * El migrador aplica una migración solo si su `when` supera el `created_at` de
 * la última registrada en la base:
 *
 *   if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis)
 *   // drizzle-orm/neon-http/migrator.js — folderMillis === journalEntry.when
 *
 * Cuando una entrada nace "en el pasado", el migrador la salta SIN ERROR: el
 * deploy dice "success" y la migración jamás se aplica.
 *
 * Pasó de verdad con 0120. La reconciliación de drift de #286 dejó a 0119 un
 * `when` 46 minutos por delante del reloj, así que 0120 se generó con un `when`
 * anterior y se saltó en silencio. Se detectó consultando la base, no por el
 * deploy: en verde y sin aplicar.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');

type JournalEntry = { idx: number; when: number; tag: string };
type Journal = { entries: JournalEntry[] };

/**
 * Desorden heredado, anterior a este test. Ambas se aplicaron hace meses, así
 * que corregirlas ahora no cambiaría nada en la base. La lista está congelada:
 * si crece, el test falla y hay una migración nueva que no se aplicará.
 */
const DESORDEN_HEREDADO = ['0043_careful_shinobi_shaw', '0080_invoice_scope'];

describe('drizzle/meta/_journal.json — orden temporal', () => {
  const journal = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drizzle/meta/_journal.json'), 'utf-8'),
  ) as Journal;

  it('tiene entradas y los idx son consecutivos', () => {
    expect(journal.entries.length).toBeGreaterThan(0);
    const idxs = journal.entries.map((e) => e.idx);
    for (let i = 1; i < idxs.length; i++) {
      expect(idxs[i]).toBe((idxs[i - 1] ?? -1) + 1);
    }
  });

  it('la última migración se aplicaría: su `when` supera a todos los anteriores', () => {
    const entries = journal.entries;
    const last = entries[entries.length - 1];
    if (!last) throw new Error('journal vacío');
    const maxAnterior = Math.max(...entries.slice(0, -1).map((e) => e.when));
    // Si esto falla, `last` NUNCA se aplicará: sube su `when` por encima de
    // maxAnterior (basta 1 ms) y vuelve a desplegar.
    expect({
      tag: last.tag,
      when: new Date(last.when).toISOString(),
      debeSuperar: new Date(maxAnterior).toISOString(),
    }).toEqual({
      tag: last.tag,
      when: new Date(last.when).toISOString(),
      debeSuperar: new Date(maxAnterior).toISOString(),
    });
    expect(last.when).toBeGreaterThan(maxAnterior);
  });

  it('no aparecen nuevas migraciones fuera de orden', () => {
    let max = -1;
    const fueraDeOrden: string[] = [];
    for (const e of journal.entries) {
      if (e.when <= max) fueraDeOrden.push(e.tag);
      if (e.when > max) max = e.when;
    }
    expect(fueraDeOrden).toEqual(DESORDEN_HEREDADO);
  });

  it('hay un fichero .sql por cada entrada del journal', () => {
    for (const entry of journal.entries) {
      expect(fs.existsSync(path.join(ROOT, 'drizzle', `${entry.tag}.sql`))).toBe(true);
    }
  });
});
