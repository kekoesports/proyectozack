/**
 * Contratos estructurales tras la migración a rutas públicas
 * `/sorteos/[creatorSlug]`:
 *
 *  - La antigua `/sorteos/plataforma/creadores/[slug]/page.tsx` que llevaba
 *    un placeholder de perfil de creador (hero + socials + "próximamente")
 *    es ahora un redirect legacy hacia `/sorteos/[slug]`.
 *  - La landing por creador vive en `/sorteos/[creatorSlug]/page.tsx` y
 *    reutiliza `PlatformCreatorLanding`.
 *  - El CSS `platform-creator-profile.css` sigue disponible para reciclar
 *    el placeholder en el futuro si volvemos a separar perfil de creador
 *    de landing pública.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[creator-profile-placeholder] legacy redirect', () => {
  const src = read('src/app/sorteos/plataforma/creadores/[slug]/page.tsx');

  it('es un redirect legacy hacia /sorteos/[slug]', () => {
    expect(src).toMatch(/redirect\(`\/sorteos\/\$\{slug[^`]*}`\)/);
    // Ya no renderiza JSX propio.
    expect(src).not.toMatch(/gp-creator-hero/);
    expect(src).not.toMatch(/gp-creator-soon/);
  });
});

describe('[creator-profile-placeholder] landing canónica', () => {
  const src = read('src/app/sorteos/[creatorSlug]/page.tsx');

  it('/sorteos/[creatorSlug] monta PlatformCreatorLanding', () => {
    expect(src).toMatch(/import\s*\{\s*PlatformCreatorLanding\s*\}/);
    expect(src).toMatch(/<PlatformCreatorLanding\s+slug=\{[a-zA-Z_]+\}\s*\/>/);
  });

  it('generateStaticParams pre-genera los slugs de la plataforma', () => {
    expect(src).toMatch(/export async function generateStaticParams/);
    expect(src).toMatch(/PLATFORM_CREATOR_SLUGS\.map\(\(slug\)\s*=>\s*\(\{\s*creatorSlug:\s*slug\s*\}\)\)/);
  });

  it('slug no válido → notFound()', () => {
    expect(src).toMatch(/!PLATFORM_CREATOR_SLUGS\.includes\(slugLc[\s\S]{0,80}notFound\(\)/);
  });

  it('robots index: true (ya no es beta noindex)', () => {
    expect(src).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true/);
  });
});

describe('[creator-profile-placeholder] CSS reservado para reuso', () => {
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
  it("layout raíz /sorteos importa 'plataforma/platform-creator-profile.css'", () => {
    const layout = read('src/app/sorteos/layout.tsx');
    expect(layout).toMatch(/import\s+'\.\/plataforma\/platform-creator-profile\.css'/);
  });
});
