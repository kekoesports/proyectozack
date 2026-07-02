/**
 * Tests del motor de misiones — capa pura + assertions estructurales.
 *
 * Puro: `progressFor(state, conditionType)` mapea el estado agregado a un
 * número. Testeable sin DB.
 *
 * Estructural: verificamos que el motor (`missions.ts`), la query de UI
 * (`queries/giveawayPlatform.ts`), la action (`actions.ts`) y el seed
 * cumplen los contratos del PR-1a (unique claims, coin_transactions,
 * trigger post-redeem, misiones nuevas por título/goal/reward).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MISSION_CONDITION_TYPES,
  type MissionConditionType,
} from '@/lib/giveaway-platform/constants';
import {
  progressFor,
  type MissionProgressState,
} from '@/lib/giveaway-platform/missions';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

function makeState(overrides: Partial<MissionProgressState> = {}): MissionProgressState {
  return {
    entriesTotal: 0,
    entriesThisMonth: 0,
    distinctCreators: 0,
    streakDays: 0,
    redemptionsTotal: 0,
    claimedMissionIds: new Set<number>(),
    ...overrides,
  };
}

describe('[mission-engine] progressFor — mapeo puro estado → número', () => {
  it('entries_total', () => {
    expect(progressFor(makeState({ entriesTotal: 7 }), 'entries_total')).toBe(7);
  });
  it('entries_this_month', () => {
    expect(progressFor(makeState({ entriesThisMonth: 4 }), 'entries_this_month')).toBe(4);
  });
  it('distinct_creators', () => {
    expect(progressFor(makeState({ distinctCreators: 3 }), 'distinct_creators')).toBe(3);
  });
  it('streak_days', () => {
    expect(progressFor(makeState({ streakDays: 5 }), 'streak_days')).toBe(5);
  });
  it('redemptions_total', () => {
    expect(progressFor(makeState({ redemptionsTotal: 1 }), 'redemptions_total')).toBe(1);
  });
  it('condition desconocida → 0 (defensivo)', () => {
    expect(progressFor(makeState({ entriesTotal: 999 }), 'never_heard_of_this')).toBe(0);
  });
  it('MISSION_CONDITION_TYPES cubre exactamente los 5 tipos soportados', () => {
    expect([...MISSION_CONDITION_TYPES].sort()).toEqual([
      'distinct_creators',
      'entries_this_month',
      'entries_total',
      'redemptions_total',
      'streak_days',
    ].sort());
  });
});

describe('[mission-engine] escalera de participaciones (composición pura)', () => {
  // Simula que el motor recorre las misiones activas: si progress >= goal y no
  // hay claim previo → cobra. Aquí verificamos que la escalera
  // 1/5/10/20/50/100 se completa correctamente en función de entriesTotal.
  const LADDER: { goal: number; expectClaimedAt: number }[] = [
    { goal: 1,   expectClaimedAt: 1 },
    { goal: 5,   expectClaimedAt: 5 },
    { goal: 10,  expectClaimedAt: 10 },
    { goal: 20,  expectClaimedAt: 20 },
    { goal: 50,  expectClaimedAt: 50 },
    { goal: 100, expectClaimedAt: 100 },
  ];
  it('cada escalón de entries_total se cumple exactamente en su umbral', () => {
    for (const step of LADDER) {
      const belowThreshold = makeState({ entriesTotal: step.goal - 1 });
      const atThreshold    = makeState({ entriesTotal: step.goal });
      expect(progressFor(belowThreshold, 'entries_total') >= step.goal).toBe(false);
      expect(progressFor(atThreshold,    'entries_total') >= step.goal).toBe(true);
    }
  });
});

describe('[mission-engine] contratos estructurales del motor', () => {
  const missionsSrc = read('src/lib/giveaway-platform/missions.ts');
  const queriesSrc  = read('src/lib/queries/giveawayPlatform.ts');
  const actionsSrc  = read('src/app/sorteos/plataforma/actions.ts');

  it('evaluateAndClaimMissions usa loadMissionProgress compartido', () => {
    expect(missionsSrc).toMatch(/loadMissionProgress\(userId\)/);
  });
  it('getMissionsWithProgress usa loadMissionProgress compartido (sin duplicar SQL)', () => {
    expect(queriesSrc).toMatch(/loadMissionProgress\(userId\)/);
    // No debe quedar el bloque duplicado antiguo con countDistinct dentro de esta query.
    expect(queriesSrc).not.toMatch(/getMissionsWithProgress[\s\S]{0,120}countDistinct/);
  });
  it('mission_claims sigue protegido por onConflictDoNothing (idempotencia UNIQUE)', () => {
    expect(missionsSrc).toMatch(/insert\(missionClaims\)[\s\S]{0,120}onConflictDoNothing/);
  });
  it('coin_transactions se crea SOLO si el claim fue nuestro', () => {
    // El flujo es: onConflictDoNothing → returning → continue si vacío → insert coin_transaction.
    expect(missionsSrc).toMatch(/if\s*\(inserted\.length\s*===\s*0\)\s*continue/);
    expect(missionsSrc).toMatch(/insert\(coinTransactions\)/);
  });
  it('evaluateAndClaimMissions se dispara desde participateInGiveaway', () => {
    // Test estructural: la llamada aparece dentro del cuerpo de la función,
    // antes de que arranque la siguiente `export async function`.
    const scope = /export async function participateInGiveaway[\s\S]*?(?=export async function|$)/.exec(actionsSrc)?.[0] ?? '';
    expect(scope).toMatch(/evaluateAndClaimMissions\(sessionUser\.id\)/);
  });
  it('evaluateAndClaimMissions se dispara desde claimDailyReward', () => {
    const scope = /export async function claimDailyReward[\s\S]*?(?=export async function|$)/.exec(actionsSrc)?.[0] ?? '';
    expect(scope).toMatch(/evaluateAndClaimMissions\(sessionUser\.id\)/);
  });
  it('evaluateAndClaimMissions se dispara desde redeemShopItem (misión Primer canje)', () => {
    const scope = /export async function redeemShopItem[\s\S]*?(?=export async function|$)/.exec(actionsSrc)?.[0] ?? '';
    expect(scope).toMatch(/evaluateAndClaimMissions\(sessionUser\.id\)/);
  });
  it('claimDailyReward usa nextStreakDay (rotación 7→1) y previousDay (DST-safe)', () => {
    expect(actionsSrc).toMatch(/nextStreakDay/);
    expect(actionsSrc).toMatch(/previousDay/);
    // Y ya NO usa Date.now() - 24*60*60*1000 para yesterday (patrón bug DST).
    expect(actionsSrc).not.toMatch(/Date\.now\(\)\s*-\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  });
});

describe('[mission-engine] loadMissionProgress cubre los 5 tipos', () => {
  const src = read('src/lib/giveaway-platform/missions.ts');
  it('SELECT entriesTotal COUNT(*) de giveawayEntries del usuario', () => {
    expect(src).toMatch(/count\(\)[\s\S]{0,200}giveawayEntries[\s\S]{0,200}eq\(giveawayEntries\.userId/);
  });
  it('SELECT entriesThisMonth filtra por giveawayEntries.createdAt >= startOfCurrentMonthUtc()', () => {
    expect(src).toMatch(/startOfCurrentMonthUtc/);
    expect(src).toMatch(/gte\(giveawayEntries\.createdAt/);
  });
  it('SELECT distinctCreators = COUNT DISTINCT giveaways.talentId (join)', () => {
    expect(src).toMatch(/countDistinct\(giveaways\.talentId\)/);
  });
  it('SELECT streakDays = dailyStreaks.currentDay', () => {
    expect(src).toMatch(/dailyStreaks\.findFirst/);
    expect(src).toMatch(/streak\?\.currentDay/);
  });
  it('SELECT redemptionsTotal COUNT(*) de redemptions', () => {
    expect(src).toMatch(/count\(\)[\s\S]{0,200}redemptions[\s\S]{0,200}eq\(redemptions\.userId/);
  });
});

describe('[mission-engine] seed PR-1a coincide con las misiones aprobadas', () => {
  const seedSrc = read('scripts/seed-giveaway-platform.ts');

  const EXPECTED_MISSIONS: {
    title: string;
    conditionType: MissionConditionType;
    goal: number;
    rewardCoins: number;
  }[] = [
    { title: 'Primera participación',     conditionType: 'entries_total',      goal: 1,   rewardCoins: 50 },
    { title: 'Participa en +5 sorteos',   conditionType: 'entries_total',      goal: 5,   rewardCoins: 250 },
    { title: 'Participa en +10 sorteos',  conditionType: 'entries_total',      goal: 10,  rewardCoins: 400 },
    { title: 'Participa en +20 sorteos',  conditionType: 'entries_total',      goal: 20,  rewardCoins: 750 },
    { title: 'Participa en +50 sorteos',  conditionType: 'entries_total',      goal: 50,  rewardCoins: 1500 },
    { title: 'Participa en +100 sorteos', conditionType: 'entries_total',      goal: 100, rewardCoins: 3000 },
    { title: 'Apoya a los 3 creadores',   conditionType: 'distinct_creators',  goal: 3,   rewardCoins: 300 },
    { title: 'Racha 3 días',              conditionType: 'streak_days',        goal: 3,   rewardCoins: 150 },
    { title: 'Racha 7 días',              conditionType: 'streak_days',        goal: 7,   rewardCoins: 400 },
    { title: 'Coleccionista mensual',     conditionType: 'entries_this_month', goal: 10,  rewardCoins: 500 },
    { title: 'Primer canje en tienda',    conditionType: 'redemptions_total',  goal: 1,   rewardCoins: 200 },
  ];

  it.each(EXPECTED_MISSIONS)(
    'seed contiene "$title" con conditionType=$conditionType, goal=$goal, reward=$rewardCoins',
    ({ title, conditionType, goal, rewardCoins }) => {
      // Escape: solo caracteres regex especiales que aparecen en los títulos ("+" y ".").
      const esc = title.replace(/[.+]/g, (c) => `\\${c}`);
      // Match tolerante a espacios: "Primera participación" ... conditionType ... goal ... rewardCoins ... en la misma "línea lógica"
      const re = new RegExp(
        `title:\\s*'${esc}',[\\s\\S]{0,300}?conditionType:\\s*'${conditionType}'[\\s\\S]{0,200}?goal:\\s*${goal}[\\s\\S]{0,120}?rewardCoins:\\s*${rewardCoins}\\b`,
      );
      expect(seedSrc).toMatch(re);
    },
  );

  it('desactiva la legacy "Coleccionista" (10 entries totales) — no la borra', () => {
    expect(seedSrc).toMatch(/DEACTIVATE_TITLES[\s\S]{0,80}'Coleccionista'/);
    expect(seedSrc).toMatch(/isActive:\s*false/);
  });
  it('seed es idempotente: chequea por title existente antes de insertar', () => {
    expect(seedSrc).toMatch(/existingMissions[\s\S]{0,100}missionTitles/);
    expect(seedSrc).toMatch(/newMissions\s*=\s*MISSIONS\.filter/);
  });
});
