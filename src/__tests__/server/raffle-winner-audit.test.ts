/**
 * Sorteos Fase 1 PR2 — pickRaffleWinnerAction emite audit
 * `raffle_winner_picked`.
 *
 * Verificación estática del source: bloqueamos regresiones si alguien
 * borra el `logGiveawayEvent(...raffle_winner_picked)`.
 *
 * Nota: no ejecutamos la Server Action end-to-end en unit test (requiere
 * DB, sesión, revalidate). El test estático es suficiente para prevenir
 * la regresión que motivó esta PR.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('pickRaffleWinnerAction — audit trace', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/admin/(dashboard)/giveaways/actions.ts'),
    'utf8',
  );

  it('importa logGiveawayEvent', () => {
    expect(source).toMatch(/from ['"]@\/lib\/audit\/logGiveawayEvent['"]/);
  });

  it('llama logGiveawayEvent con action="raffle_winner_picked"', () => {
    expect(source).toMatch(/logGiveawayEvent\(\s*\{[\s\S]*?raffle_winner_picked/);
  });

  it('outcome="success" en el logueo', () => {
    expect(source).toMatch(/raffle_winner_picked[\s\S]*?outcome:\s*['"]success['"]/);
  });

  it('captura adminUserId en metadata', () => {
    expect(source).toMatch(/adminUserId/);
  });

  it('captura giveawayId, winnerCount, entriesCount en metadata', () => {
    expect(source).toMatch(/giveawayId/);
    expect(source).toMatch(/winnerCount/);
    expect(source).toMatch(/entriesCount/);
  });

  it('el admin viene de requirePermission (no de fuente no verificada)', () => {
    expect(source).toMatch(/const\s*\{\s*user:\s*adminUser\s*\}\s*=\s*await\s+requirePermission\(\s*['"]sorteos['"]\s*,\s*['"]write['"]\s*\)/);
  });
});
