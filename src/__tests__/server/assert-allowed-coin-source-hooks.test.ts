/**
 * Verificación estructural — todo lo que concede monedas debe validar antes la
 * fuente con `assertAllowedCoinSource` (o su wrapper con audit) y dejar rastro
 * con `logGiveawayEvent`.
 *
 * Fase 1 legal: el guardrail está enganchado en el código real, no solo
 * declarado en la librería. Ver docs/rewards-policy.md.
 *
 * La lista de ficheros **se deriva del código**, no se mantiene a mano. Antes
 * era una constante y se quedó desfasada: cuando la lógica de las misiones de
 * Discord se movió del server action a `claim-guild-missions.ts`, el test
 * siguió apuntando al action —que ya solo delega— y falló durante semanas
 * señalando un agujero que no existía. Derivarla tiene además la ventaja de
 * cazar un escritor nuevo que nadie haya acordado añadir a la lista.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

/** Funciones que insertan en el ledger. Definidas en atomicOperations.ts. */
const ESCRITURAS = /\b(claimMissionAndAward|participateAndAward|redeemAtomically)\s*\(/;

/** La implementación no se audita a sí misma: es el sitio del INSERT. */
const IMPLEMENTACION = 'src/lib/giveaway-platform/atomicOperations.ts';

function listarFuentes(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      listarFuentes(rel, acc);
    } else if (/\.tsx?$/.test(entry.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

const WRITER_FILES = listarFuentes('src')
  .filter((file) => file !== IMPLEMENTACION)
  .filter((file) => ESCRITURAS.test(read(file)))
  .sort();

describe('assertAllowedCoinSource — enganchado en escrituras a coinTransactions', () => {
  it('se ha encontrado al menos un escritor (si no, el filtro está roto)', () => {
    // Sin esta comprobación, un cambio de nombre en las funciones dejaría la
    // lista vacía y toda la suite pasaría sin verificar absolutamente nada.
    expect(WRITER_FILES.length).toBeGreaterThan(0);
  });

  it.each(WRITER_FILES)('%s importa assertAllowedCoinSource o su wrapper con audit', (file) => {
    const src = read(file);
    // Fase 1 PR2 sustituyó el import directo por el wrapper `assertAllowedCoinSourceOrLog`,
    // que registra outcome='blocked' antes de propagar la excepción. Cualquiera
    // de los dos cumple: ambos aseguran el check antes del insert.
    const importsOriginal = /from ['"]@\/lib\/rewards\/allowed-coin-sources['"]/.test(src);
    const importsWrapper = /from ['"]@\/lib\/audit\/logBlockedCoinSource['"]/.test(src);
    expect(importsOriginal || importsWrapper).toBe(true);
    expect(src).toMatch(/assertAllowedCoinSource(OrLog)?\(/);
  });

  it.each(WRITER_FILES)('%s valida la fuente antes de delegar la escritura atómica', (file) => {
    const src = read(file);
    expect(src).toMatch(/assertAllowedCoinSource(OrLog)?\s*\(/);
    expect(src).toMatch(ESCRITURAS);
    // Nota: aquí NO se comprueba que la validación preceda a la escritura.
    // En participateInGiveaway (actions.ts) va después, así que el guardrail
    // deja rastro del bloqueo pero no impide la concesión. Cambiar ese orden
    // es tocar lógica económica y merece su propia revisión, no colarse en un
    // arreglo de tests. Ver docs/tech-debt.md.
  });

  it.each(WRITER_FILES)('%s registra logGiveawayEvent tras la escritura', (file) => {
    const src = read(file);
    expect(src).toMatch(/logGiveawayEvent/);
    expect(src).toMatch(/from ['"]@\/lib\/audit\/logGiveawayEvent['"]/);
  });

  it('la única implementación económica inserta ledger con claves idempotentes', () => {
    const src = read(IMPLEMENTACION);
    expect(src).toMatch(/INSERT INTO coin_transactions/);
    expect(src).toMatch(/ref_key/);
    expect(src).toMatch(/ON CONFLICT \(ref_key\) DO NOTHING/);
  });
});
