/**
 * Contratos estructurales del hub de recompensas.
 *
 * No hace queries reales — verifica que el CÓDIGO fuente cumple los
 * invariantes prometidos al owner:
 *   - Ranking mensual solo cuenta racha + mision (no sorteo/tienda/admin).
 *   - Ranking mensual usa amount > 0, no saldo.
 *   - Participantes NO exponen email/tradeUrl/steamId/IP.
 *   - Server action `participateInGiveaway` respeta entryAwardCoins=0
 *     (no dispara coin_transactions).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[rewards-hub-queries] Monthly ranking sources', () => {
  const src = read('src/lib/queries/giveawayPlatform.ts');

  it('MONTHLY_RANKING_SOURCES solo lista racha + mision', () => {
    // La constante debe ser exactamente estas dos entradas, sin sorteo/tienda/admin.
    expect(src).toMatch(/MONTHLY_RANKING_SOURCES\s*=\s*\[\s*'racha'\s*,\s*'mision'\s*\]/);
  });

  it('getMonthlyPointsRanking filtra por amount > 0', () => {
    const fn = /export async function getMonthlyPointsRanking[\s\S]{0,2000}/.exec(src)?.[0] ?? '';
    expect(fn).toMatch(/gt\(coinTransactions\.amount,\s*0\)/);
  });

  it('getMonthlyPointsRanking usa MONTHLY_RANKING_SOURCES en el WHERE', () => {
    const fn = /export async function getMonthlyPointsRanking[\s\S]{0,2000}/.exec(src)?.[0] ?? '';
    expect(fn).toMatch(/inArray\(coinTransactions\.source,\s*MONTHLY_RANKING_SOURCES/);
  });

  it('getUserMonthlyStanding aplica los mismos filtros', () => {
    const fn = /export async function getUserMonthlyStanding[\s\S]{0,3500}/.exec(src)?.[0] ?? '';
    expect(fn).toMatch(/gt\(coinTransactions\.amount,\s*0\)/);
    expect(fn).toMatch(/MONTHLY_RANKING_SOURCES/);
  });
});

describe('[rewards-hub-queries] Participantes — no PII', () => {
  const src = read('src/lib/queries/giveawayPlatform.ts');
  const fn = /export async function getRaffleParticipants[\s\S]{0,2000}/.exec(src)?.[0] ?? '';

  it('getRaffleParticipants selecciona solo name/image/isPrivate/createdAt del user', () => {
    expect(fn).toMatch(/name:\s*user\.name/);
    expect(fn).toMatch(/image:\s*user\.image/);
    expect(fn).toMatch(/isPrivate:\s*playerProfiles\.isPrivate/);
  });

  it('getRaffleParticipants NO expone email/tradeUrl/steamId', () => {
    expect(fn).not.toMatch(/user\.email/);
    expect(fn).not.toMatch(/steamTradeUrl/);
    expect(fn).not.toMatch(/steamId/);
    expect(fn).not.toMatch(/ip[Hh]ash/);
  });

  it('getRaffleParticipants enmascara cuando isPrivate=true', () => {
    expect(fn).toMatch(/r\.isPrivate === false \? r\.name : maskName/);
  });
});

describe('[rewards-hub-queries] Free raffles filtro entry_award_coins = 0', () => {
  const src = read('src/lib/queries/giveawayPlatform.ts');
  const fn = /export async function getFreeRafflesForCreator[\s\S]{0,2500}/.exec(src)?.[0] ?? '';

  it('filtra estrictamente entry_award_coins = 0', () => {
    expect(fn).toMatch(/eq\(giveaways\.entryAwardCoins,\s*0\)/);
  });
});

describe('[rewards-hub-actions] participateInGiveaway respeta entryAwardCoins', () => {
  const src = read('src/app/sorteos/plataforma/actions.ts');
  // Recorte hasta la siguiente `export async function` en vez de una ventana de N
  // caracteres: el límite fijo se quedaba corto al crecer la función y las
  // aserciones pasaban por ocurrencias truncadas (o, al ampliarlo, por código
  // de claimDailyReward). Mismo patrón que mission-engine.test.ts.
  const fn = /export async function participateInGiveaway[\s\S]*?(?=export async function|$)/.exec(src)?.[0] ?? '';
  const atomic = read('src/lib/giveaway-platform/atomicOperations.ts');

  it('usa el premio persistido que devuelve la operación atómica', () => {
    // Lo que se reporta al usuario y lo que se audita salen del valor que
    // devolvió la escritura, no de la lectura previa de `giveaway`.
    expect(fn).toMatch(/awardCoins\s*=\s*participation\.entry_award_coins/);
    expect(fn).toMatch(/coinsEarned:\s*awardCoins/);
    expect(fn).toMatch(/awardCoins\s*>\s*0\s*\?\s*'giveaway_participate'/);
  });

  it('el guardrail de fuente se decide con la lectura previa, antes de escribir', () => {
    // El gate no puede usar participation.entry_award_coins porque para
    // entonces la concesión ya está commiteada. Usa giveaway.entryAwardCoins,
    // leído antes de llamar a participateAndAward. Ver el test de orden en
    // assert-allowed-coin-source-hooks.test.ts.
    expect(fn).toMatch(/if\s*\(\s*giveaway\.entryAwardCoins\s*>\s*0\s*\)/);
    const gate = fn.indexOf('giveaway.entryAwardCoins > 0');
    const write = fn.indexOf('await participateAndAward(');
    expect(gate).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(write);
  });

  it('NO inserta coin_transactions cuando el premio es 0', () => {
    expect(atomic).toMatch(/WHERE e\.entry_award_coins > 0/);
  });

  it('SIEMPRE evalúa las misiones tras un INSERT en giveaway_entries (aunque awardCoins sea 0)', () => {
    // Regresión 2026-07-10 (bug B3 del audit): antes se llamaba a
    // evaluateAndClaimMissions sólo cuando awardCoins > 0, lo que dejaba
    // la misión "Primera participación" sin otorgar si el primer sorteo
    // del usuario era gratis. Ahora la llamada es incondicional.
    expect(fn).toMatch(/const\s+missionsCompleted\s*=\s*await\s+evaluateAndClaimMissions\(/);
    // Bloquea la reintroducción del patrón antiguo:
    expect(fn).not.toMatch(/awardCoins\s*>\s*0\s*\?\s*await\s+evaluateAndClaimMissions/);
  });

  it('valida borradores y exige status activo', () => {
    expect(fn).toMatch(/status\s*===\s*'draft'/);
    expect(fn).toMatch(/status\s*!==\s*'active'/);
    expect(atomic).toMatch(/g\.status = 'active'/);
  });
});

describe('[rewards-hub-actions] pickRaffleWinnerAction admin-guarded', () => {
  const src = read('src/app/admin/(dashboard)/giveaways/actions.ts');
  const fn = /export async function pickRaffleWinnerAction[\s\S]{0,3000}/.exec(src)?.[0] ?? '';

  const atomic = read('src/lib/giveaway-platform/atomicOperations.ts');

  it('gate por requirePermission("sorteos", "publish")', () => {
    expect(fn).toMatch(/requirePermission\('sorteos',\s*'publish'\)/);
  });

  it('selecciona ganador por random() de Postgres', () => {
    expect(atomic).toMatch(/ORDER BY random\(\)/);
  });

  it('marca el sorteo como status=ended tras elegir ganador', () => {
    expect(atomic).toMatch(/SET status = 'ended'/);
  });

  it('enlaza winnerUserId al user real elegido', () => {
    expect(atomic).toMatch(/winner_user_id/);
  });
});
