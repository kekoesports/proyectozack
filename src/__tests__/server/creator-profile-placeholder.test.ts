/**
 * Contratos estructurales del perfil de creador placeholder en
 * /sorteos/plataforma/creadores/[slug].
 *
 * Verifica:
 *  - `notFound()` si el slug no está en PLATFORM_CREATOR_SLUGS.
 *  - Renderiza hero (avatar, código, bio) + socials + estadísticas "próximamente".
 *  - CTA hacia el bloque de sorteos del creador en la landing.
 *  - `generateStaticParams` pre-genera rutas para todos los creadores.
 *  - CSS del placeholder existe (dashed border + repeating-linear-gradient).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[creator-profile-placeholder] page', () => {
  const src = read('src/app/sorteos/plataforma/creadores/[slug]/page.tsx');

  it('llama notFound() cuando el slug no está en PLATFORM_CREATOR_SLUGS', () => {
    expect(src).toMatch(/if\s*\(!PLATFORM_CREATOR_SLUGS\.includes\([\s\S]{0,120}\)\)\s*\{\s*notFound\(\)/);
  });

  it('renderiza hero + socials + próximamente', () => {
    expect(src).toMatch(/gp-creator-hero/);
    expect(src).toMatch(/gp-creator-socials/);
    expect(src).toMatch(/gp-creator-soon/);
    expect(src).toMatch(/Próximamente/);
  });

  it('CTA sorteos apunta a /sorteos/plataforma?creador=', () => {
    expect(src).toMatch(/href=\{\`\/sorteos\/plataforma\?creador=\$\{active\.slug\}#sorteos\`\}/);
  });

  it('generateStaticParams pre-genera los slugs de la plataforma', () => {
    expect(src).toMatch(/export function generateStaticParams/);
    expect(src).toMatch(/PLATFORM_CREATOR_SLUGS\.map\(\(slug\)\s*=>\s*\(\{\s*slug\s*\}\)\)/);
  });

  it('robots noindex (no público, iteración)', () => {
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it('resuelve external vs internal para el contador de sorteos', () => {
    expect(src).toMatch(/isExternalCreator\(active\.slug\)/);
    expect(src).toMatch(/getExternalGiveawaysForCreator/);
    expect(src).toMatch(/getGiveawaysWithEntryData/);
  });
});

describe('[creator-profile-placeholder] CSS', () => {
  const css = read('src/app/sorteos/plataforma/platform-creator-profile.css');

  it('define hero con gradient dinámico usando --c1 / --c2', () => {
    expect(css).toMatch(/\.gp-creator-hero\s*\{[\s\S]{0,600}var\(--c1/);
    expect(css).toMatch(/\.gp-creator-hero\s*\{[\s\S]{0,600}var\(--c2/);
  });

  it('próximamente-card usa borde dashed y repeating-linear-gradient', () => {
    expect(css).toMatch(/\.gp-creator-soon-card\s*\{[\s\S]{0,400}repeating-linear-gradient/);
    expect(css).toMatch(/\.gp-creator-soon-card\s*\{[\s\S]{0,400}border:\s*1px\s+dashed/);
  });
});

describe('[creator-profile-placeholder] layout carga el CSS', () => {
  const layout = read('src/app/sorteos/plataforma/layout.tsx');

  it("importa './platform-creator-profile.css'", () => {
    expect(layout).toMatch(/import\s+'\.\/platform-creator-profile\.css'/);
  });
});
