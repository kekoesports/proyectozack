/**
 * Contratos estructurales del ranking global de la plataforma.
 *
 * Verifica:
 *  - Query `getMonthlyRanking` no filtra por creador (es global).
 *  - Query `getMonthlyRankingTotal` cuenta jugadores distintos del mes.
 *  - Componente muestra "Ranking global", tickets, y highlight del user actual.
 *  - Componente es read-only (no botones de acción, solo listado).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[ranking-global] query', () => {
  const src = read('src/lib/queries/giveawayPlatform.ts');

  it('getMonthlyRanking existe y agrupa por userId (sin creator filter)', () => {
    expect(src).toMatch(/export async function getMonthlyRanking/);
    // No debe filtrar giveawayEntries por talent_id / creador
    const fn = src.slice(src.indexOf('getMonthlyRanking'), src.indexOf('getMonthlyRankingTotal'));
    expect(fn).not.toMatch(/talentId|creator/i);
    expect(fn).toMatch(/groupBy\(giveawayEntries\.userId/);
  });

  it('getMonthlyRankingTotal cuenta distinct userId del mes', () => {
    expect(src).toMatch(/export async function getMonthlyRankingTotal/);
    expect(src).toMatch(/count\(distinct\s+\$\{giveawayEntries\.userId\}\)/);
    expect(src).toMatch(/monthStart\.setUTCDate\(1\)/);
  });

  it('respeta player_profiles.isPrivate enmascarando el nombre', () => {
    expect(src).toMatch(/isPrivate\s*===\s*false\s*\?\s*r\.name/);
    expect(src).toMatch(/\`\$\{r\.name\.slice\(0,\s*1\)\}\*\*\*\*\*\`/);
  });
});

describe('[ranking-global] componente', () => {
  const src = read('src/features/giveaway-platform/components/MonthlyRanking.tsx');

  it('acepta props totalPlayers y currentUserId', () => {
    expect(src).toMatch(/totalPlayers:\s*number/);
    expect(src).toMatch(/currentUserId:\s*string\s*\|\s*null/);
  });

  it('muestra el total de jugadores en la nota', () => {
    expect(src).toMatch(/totalPlayers\.toLocaleString\('es-ES'\)/);
    expect(src).toMatch(/jugadores este mes/);
  });

  it('marca el copy como global y read-only', () => {
    expect(src).toMatch(/Ranking global/i);
    expect(src).toMatch(/read-only/);
  });

  it('resalta al usuario actual con clase `me` y tag', () => {
    expect(src).toMatch(/const isMe\s*=\s*row\.userId\s*===\s*currentUserId/);
    expect(src).toMatch(/gp-rank-me-tag/);
    expect(src).toMatch(/className=\{`gp-rank-podium-card p\$\{pos\}\$\{isMe \? ' me' : ''\}`\}/);
  });

  it('NO contiene botones interactivos (read-only)', () => {
    expect(src).not.toMatch(/<button/);
    expect(src).not.toMatch(/onClick=/);
    expect(src).not.toMatch(/onChange=/);
  });
});

describe('[ranking-global] CSS highlight', () => {
  const css = read('src/app/sorteos/plataforma/platform-widgets.css');

  it('define .gp-rank-podium-card.me con acento SP pink', () => {
    expect(css).toMatch(/\.gp-rank-podium-card\.me\s*\{[\s\S]{0,300}rgba\(224,\s*48,\s*112/);
  });

  it('define .gp-rank-list li.me con background y border-left', () => {
    expect(css).toMatch(/\.gp-rank-list\s+li\.me\s*\{[\s\S]{0,200}background/);
    expect(css).toMatch(/\.gp-rank-list\s+li\.me\s*\{[\s\S]{0,200}border-left/);
  });

  it('define .gp-rank-me-tag con color pink y uppercase', () => {
    expect(css).toMatch(/\.gp-rank-me-tag\s*\{[\s\S]{0,200}text-transform:\s*uppercase/);
  });
});
