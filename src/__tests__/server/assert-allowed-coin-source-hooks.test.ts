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
  it.each(WRITER_FILES)('%s importa assertAllowedCoinSource', (file) => {
    const src = read(file);
    expect(src).toMatch(/assertAllowedCoinSource/);
    expect(src).toMatch(/from ['"]@\/lib\/rewards\/allowed-coin-sources['"]/);
  });

  it.each(WRITER_FILES)('%s llama a assertAllowedCoinSource antes de db.insert(coinTransactions)', (file) => {
    const src = read(file);
    // Cada `db.insert(coinTransactions)` debe estar precedido en las 3
    // líneas anteriores por una llamada a `assertAllowedCoinSource(...)`.
    const lines = src.split(/\r?\n/);
    const insertLines: number[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (/db\.insert\(coinTransactions\)/.test(lines[i] ?? '')) insertLines.push(i);
    }
    expect(insertLines.length).toBeGreaterThan(0);
    for (const idx of insertLines) {
      const window = lines.slice(Math.max(0, idx - 4), idx).join('\n');
      expect(window).toMatch(/assertAllowedCoinSource\(/);
    }
  });

  it.each(WRITER_FILES)('%s registra logGiveawayEvent tras la escritura', (file) => {
    const src = read(file);
    expect(src).toMatch(/logGiveawayEvent/);
    expect(src).toMatch(/from ['"]@\/lib\/audit\/logGiveawayEvent['"]/);
  });
});
