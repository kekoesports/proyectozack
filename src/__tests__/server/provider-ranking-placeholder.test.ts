/**
 * Contratos estructurales del ProviderRankingPlaceholder.
 *
 * Verifica:
 *  - Componente renderiza título con nombre del provider + creador.
 *  - Genera 5 puestos con skeleton (aria-hidden).
 *  - Copy "Próximamente" es explícito.
 *  - Se integra en ExternalGiveawaysSection debajo de finished.
 *  - CSS con dashed border + skeleton animation + reduced-motion off.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[provider-ranking-placeholder] componente', () => {
  const src = read('src/features/giveaway-platform/components/ProviderRankingPlaceholder.tsx');

  it('recibe providerDisplayName + creatorDisplayName', () => {
    expect(src).toMatch(/providerDisplayName:\s*string/);
    expect(src).toMatch(/creatorDisplayName:\s*string/);
  });

  it('render título "Top participantes en {provider} · {creator}"', () => {
    expect(src).toMatch(/Top participantes en \{providerDisplayName\} · \{creatorDisplayName\}/);
  });

  it('genera 5 filas con Array.from({ length: 5 })', () => {
    expect(src).toMatch(/Array\.from\(\{\s*length:\s*5\s*\}/);
  });

  it('cada fila es aria-hidden y usa skeleton', () => {
    expect(src).toMatch(/<li\s+key=\{n\}\s+aria-hidden>/);
    expect(src).toMatch(/skeleton skeleton-name/);
    expect(src).toMatch(/skeleton skeleton-value/);
  });

  it('copy incluye "Próximamente" explícito', () => {
    expect(src).toMatch(/Próximamente/);
  });
});

describe('[provider-ranking-placeholder] integración', () => {
  const src = read('src/features/giveaway-platform/components/ExternalGiveawaysSection.tsx');

  it('ExternalGiveawaysSection importa y renderiza el placeholder', () => {
    expect(src).toMatch(/import\s*\{\s*ProviderRankingPlaceholder\s*\}/);
    expect(src).toMatch(/<ProviderRankingPlaceholder[\s\S]{0,200}providerDisplayName=\{provider\.displayName\}/);
    expect(src).toMatch(/<ProviderRankingPlaceholder[\s\S]{0,200}creatorDisplayName=\{creatorDisplayName\}/);
  });
});

describe('[provider-ranking-placeholder] CSS', () => {
  const css = read('src/app/sorteos/plataforma/platform-external-giveaways.css');

  it('.gp-provider-rank tiene borde dashed', () => {
    expect(css).toMatch(/\.gp-provider-rank\s*\{[\s\S]{0,300}border:\s*1px\s+dashed/);
  });

  it('.skeleton tiene animation gp-skeleton', () => {
    expect(css).toMatch(/\.skeleton\s*\{[\s\S]{0,400}animation:\s*gp-skeleton/);
    expect(css).toMatch(/@keyframes\s+gp-skeleton/);
  });

  it('respeta prefers-reduced-motion desactivando la animación', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,200}animation:\s*none/);
  });
});
