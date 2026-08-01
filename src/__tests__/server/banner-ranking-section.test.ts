/**
 * Banner #ranking — monthly points leaderboard is the canonical ranking UX.
 * Nav Ranking → #ranking section on creator landing; RewardsHub no longer hosts it.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('Banner ranking section wiring', () => {
  it('PlatformNav Ranking points to #ranking', () => {
    const nav = read('src/features/giveaway-platform/components/PlatformNav.tsx');
    expect(nav).toMatch(/href:\s*['"]#ranking['"]/);
    expect(nav).toMatch(/label:\s*['"]Ranking['"]/);
  });

  it('PlatformCreatorLanding renders id="ranking" with MonthlyPointsRanking page variant', () => {
    const landing = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');
    expect(landing).toMatch(/id=["']ranking["']/);
    expect(landing).toMatch(/MonthlyPointsRanking/);
    expect(landing).toMatch(/variant=["']page["']/);
    // Ranking section is a sibling of recompensas, not nested only inside RewardsHub.
    const rankingIdx = landing.indexOf('id="ranking"');
    const recompensasIdx = landing.indexOf('id="recompensas"');
    expect(rankingIdx).toBeGreaterThan(-1);
    expect(recompensasIdx).toBeGreaterThan(-1);
    expect(rankingIdx).toBeLessThan(recompensasIdx);
  });

  it('RewardsHub no longer imports or tabs MonthlyPointsRanking', () => {
    const hub = read('src/features/giveaway-platform/components/RewardsHub.tsx');
    expect(hub).not.toMatch(/MonthlyPointsRanking/);
    expect(hub).not.toMatch(/Ranking mensual/);
    expect(hub).toMatch(/Recompensas por puntos/);
    expect(hub).toMatch(/Sorteos gratis/);
    expect(hub).toMatch(/type TabKey = 'shop' \| 'raffles'/);
  });

  it('MonthlyPointsRanking supports variant page | panel', () => {
    const src = read('src/features/giveaway-platform/components/MonthlyPointsRanking.tsx');
    expect(src).toMatch(/variant\?: 'page' \| 'panel'/);
    expect(src).toMatch(/is-page/);
    expect(src).toMatch(/misiones y rachas/);
  });
});
