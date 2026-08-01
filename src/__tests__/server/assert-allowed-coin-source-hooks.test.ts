/**
 * Verificación estructural — cada punto de inserción a `coinTransactions`
 * debe llamar a `assertAllowedCoinSource` inmediatamente antes.
 *
 * Fase 1 legal: el guardrail está enganchado en las server actions reales,
 * no solo declarado en la librería. Ver docs/rewards-policy.md.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const WRITER_FILES = [
  'src/app/sorteos/plataforma/actions.ts',
  'src/app/sorteos/plataforma/discord-mission-action.ts',
  'src/app/sorteos/plataforma/twitch-mission-action.ts',
  'src/lib/giveaway-platform/missions.ts',
] as const;

describe('assertAllowedCoinSource — enganchado en escrituras a coinTransactions', () => {
  it.each(WRITER_FILES)('%s importa assertAllowedCoinSource o su wrapper con audit', (file) => {
    const src = read(file);
    // Fase 1 PR2 sustituyó el import directo por el wrapper `assertAllowedCoinSourceOrLog`
    // que registra outcome='blocked' antes de propagar la excepción. El original o el
    // wrapper cumplen el contrato — ambos aseguran el check antes del insert.
    const importsOriginal = /from ['"]@\/lib\/rewards\/allowed-coin-sources['"]/.test(src);
    const importsWrapper = /from ['"]@\/lib\/audit\/logBlockedCoinSource['"]/.test(src);
    expect(importsOriginal || importsWrapper).toBe(true);
    expect(src).toMatch(/assertAllowedCoinSource(OrLog)?\(/);
  });

  it.each(WRITER_FILES)('%s valida la fuente antes de delegar la escritura atómica', (file) => {
    const src = read(file);
    expect(src).toMatch(/assertAllowedCoinSource(OrLog)?\(/);
    expect(src).toMatch(/participateAndAward|redeemAtomically|claimMissionAndAward/);
  });

  it('la única implementación económica inserta ledger con claves idempotentes', () => {
    const src = read('src/lib/giveaway-platform/atomicOperations.ts');
    expect(src).toMatch(/INSERT INTO coin_transactions/);
    expect(src).toMatch(/ref_key/);
    expect(src).toMatch(/ON CONFLICT \(ref_key\) DO NOTHING/);
  });

  it.each(WRITER_FILES)('%s registra logGiveawayEvent tras la escritura', (file) => {
    const src = read(file);
    expect(src).toMatch(/logGiveawayEvent/);
    expect(src).toMatch(/from ['"]@\/lib\/audit\/logGiveawayEvent['"]/);
  });
});
