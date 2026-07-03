/**
 * Contratos estructurales del ProviderRankingPlaceholder (versión mini).
 *
 * Post-QA PR #170: el placeholder anterior era un skeleton grande que
 * parecía "bloque vacío". Se redujo a un banner de una línea. Verificamos:
 *  - Componente NO renderiza skeleton grande (5 filas).
 *  - Renderiza un aside pequeño con icono + copy honesto "próximamente".
 *  - Sigue integrándose desde ExternalGiveawaysSection.
 *  - CSS del banner mini existe; el CSS legacy (.gp-provider-rank + skeleton)
 *    fue eliminado.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[provider-ranking-placeholder] componente mini', () => {
  const src = read('src/features/giveaway-platform/components/ProviderRankingPlaceholder.tsx');

  it('recibe providerDisplayName + creatorDisplayName', () => {
    expect(src).toMatch(/providerDisplayName:\s*string/);
    expect(src).toMatch(/creatorDisplayName:\s*string/);
  });

  it('NO renderiza skeleton grande (Array.from 5) — se eliminó', () => {
    expect(src).not.toMatch(/Array\.from\(/);
    expect(src).not.toMatch(/skeleton/);
  });

  it('renderiza un banner mini con aria-live=off (no interrumpe screen readers)', () => {
    expect(src).toMatch(/<aside[\s\S]{0,120}aria-live="off"/);
    expect(src).toMatch(/gp-provider-rank-mini/);
  });

  it('copy honesto: "Ranking {provider} próximamente"', () => {
    expect(src).toMatch(/Ranking \{providerDisplayName\} próximamente/);
    expect(src).toMatch(/participantes verificables/);
  });
});

describe('[provider-ranking-placeholder] integración', () => {
  const src = read('src/features/giveaway-platform/components/ExternalGiveawaysSection.tsx');

  it('ExternalGiveawaysSection sigue importando y usando el placeholder', () => {
    expect(src).toMatch(/import\s*\{\s*ProviderRankingPlaceholder\s*\}/);
    expect(src).toMatch(/<ProviderRankingPlaceholder[\s\S]{0,200}providerDisplayName=\{provider\.displayName\}/);
    expect(src).toMatch(/<ProviderRankingPlaceholder[\s\S]{0,200}creatorDisplayName=\{creatorDisplayName\}/);
  });
});

describe('[provider-ranking-placeholder] CSS', () => {
  const css = read('src/app/sorteos/plataforma/platform-external-giveaways.css');

  it('define .gp-provider-rank-mini con borde dashed', () => {
    expect(css).toMatch(/\.gp-provider-rank-mini\s*\{[\s\S]{0,400}border:\s*1px\s+dashed/);
  });

  it('CSS legacy del skeleton (gp-provider-rank-list .skeleton) fue eliminado', () => {
    expect(css).not.toMatch(/\.gp-provider-rank-list/);
    expect(css).not.toMatch(/@keyframes\s+gp-skeleton/);
  });
});
