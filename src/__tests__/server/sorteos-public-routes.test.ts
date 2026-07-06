/**
 * Contratos estructurales de las rutas públicas de SocialPro Giveaways.
 *
 * Rutas nuevas:
 *   /sorteos                        índice de creadores.
 *   /sorteos/[creatorSlug]          landing por creador (canonical).
 *   /sorteos/perfil                 perfil de usuario Steam.
 *
 * Rutas legacy (redirects hacia las nuevas):
 *   /sorteos/plataforma             → /sorteos (o /sorteos/{creador} si viene ?creador=)
 *   /sorteos/plataforma/perfil      → /sorteos/perfil
 *   /sorteos/plataforma/creadores/[slug] → /sorteos/[slug]
 *
 * Redirect defensivo por typo del slug: /sorteos/zackezitor → /sorteos/zacketizor.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[sorteos-routes] existen los archivos', () => {
  it('/sorteos/page.tsx existe (índice)', () => {
    const src = read('src/app/sorteos/page.tsx');
    expect(src).toMatch(/export default (async )?function SorteosIndexPage/);
  });
  it('/sorteos/[creatorSlug]/page.tsx existe', () => {
    const src = read('src/app/sorteos/[creatorSlug]/page.tsx');
    expect(src).toMatch(/export default (async )?function SorteosCreatorPage/);
  });
  it('/sorteos/perfil/page.tsx existe', () => {
    const src = read('src/app/sorteos/perfil/page.tsx');
    expect(src).toMatch(/export default (async )?function PerfilPage/);
  });
  it('PlatformCreatorLanding component existe y se importa desde [creatorSlug]', () => {
    const c  = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');
    const p  = read('src/app/sorteos/[creatorSlug]/page.tsx');
    expect(c).toMatch(/export (async )?function PlatformCreatorLanding/);
    expect(p).toMatch(/import\s*\{\s*PlatformCreatorLanding\s*\}/);
    expect(p).toMatch(/<PlatformCreatorLanding\s+slug=\{[a-zA-Z_]+\}\s*\/>/);
  });
});

describe('[sorteos-routes] índice /sorteos', () => {
  const src = read('src/app/sorteos/page.tsx');

  it('renderiza título "SocialPro Giveaways" en el hero (eyebrow)', () => {
    expect(src).toMatch(/gp-index-eyebrow[\s\S]{0,80}SocialPro Giveaways/);
  });
  it('lista creadores desde PLATFORM_CREATOR_SLUGS + talents', () => {
    expect(src).toMatch(/PLATFORM_CREATOR_SLUGS/);
    expect(src).toMatch(/db\.query\.talents\.findMany/);
  });
  it('enlaza a /sorteos/[slug] para cada creador (no ?creador= legacy)', () => {
    expect(src).toMatch(/href=\{`\/sorteos\/\$\{c\.slug\}`\}/);
    expect(src).not.toMatch(/\?creador=\$\{/);
  });
  it('muestra "provider próximamente" cuando el creador no tiene binding', () => {
    expect(src).toMatch(/getCreatorBinding/);
    expect(src).toMatch(/Provider próximamente/i);
  });
  it('metadata canonical apunta a /sorteos + index/follow', () => {
    expect(src).toMatch(/canonical:\s*'\/sorteos'/);
    expect(src).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true/);
  });
  it('incluye <PlatformFooter /> con links legales', () => {
    expect(src).toMatch(/<PlatformFooter\s*\/>/);
  });
});

describe('[sorteos-routes] /sorteos/[creatorSlug]', () => {
  const src = read('src/app/sorteos/[creatorSlug]/page.tsx');

  it('generateStaticParams pre-genera los 4 slugs de la plataforma', () => {
    expect(src).toMatch(/export async function generateStaticParams/);
    expect(src).toMatch(/PLATFORM_CREATOR_SLUGS\.map\(\(slug\)\s*=>\s*\(\{\s*creatorSlug:\s*slug\s*\}\)\)/);
  });
  it('metadata dinámico usa nombre del talent y devuelve canonical /sorteos/{slug}', () => {
    expect(src).toMatch(/generateMetadata/);
    expect(src).toMatch(/db\.query\.talents\.findFirst/);
    expect(src).toMatch(/canonical:\s*`\/sorteos\/\$\{canonicalSlug\}`/);
    expect(src).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true/);
  });
  it('redirect defensivo por typo (zackezitor → zacketizor) + target vacío al índice', () => {
    expect(src).toMatch(/SLUG_TYPO_REDIRECTS:\s*Record<string,\s*string>/);
    expect(src).toMatch(/zackezitor:\s*'zacketizor'/);
    // Target='' (por ejemplo martinez retirado) → redirect al índice.
    expect(src).toMatch(/redirect\(target\s*\?\s*`\/sorteos\/\$\{target\}`\s*:\s*'\/sorteos'\)/);
  });
  it('martinez retirado: redirect a /sorteos (no notFound ni landing)', () => {
    expect(src).toMatch(/martinez:\s*''/);
    // Y no aparece como slug canónico.
    expect(src).not.toMatch(/martines:\s*'martinez'/);
  });
  it('slug no válido → notFound()', () => {
    expect(src).toMatch(/!PLATFORM_CREATOR_SLUGS\.includes\(slugLc[\s\S]{0,80}notFound\(\)/);
  });
});

describe('[sorteos-routes] legacy redirects', () => {
  it('/sorteos/plataforma/page.tsx redirige a /sorteos o /sorteos/{creador}', () => {
    const src = read('src/app/sorteos/plataforma/page.tsx');
    expect(src).toMatch(/redirect\(`\/sorteos\/\$\{slug\}`\)/);
    expect(src).toMatch(/redirect\('\/sorteos'\)/);
    expect(src).not.toMatch(/export default (async )?function LegacyPlataformaRedirect[\s\S]{0,600}<[A-Z]/);
  });
  it('/sorteos/plataforma/creadores/[slug]/page.tsx redirige a /sorteos/[slug]', () => {
    const src = read('src/app/sorteos/plataforma/creadores/[slug]/page.tsx');
    expect(src).toMatch(/redirect\(`\/sorteos\/\$\{slug[^`]*}`\)/);
  });
  it('/sorteos/plataforma/perfil/page.tsx redirige a /sorteos/perfil', () => {
    const src = read('src/app/sorteos/plataforma/perfil/page.tsx');
    expect(src).toMatch(/redirect\('\/sorteos\/perfil'\)/);
  });
  it('layout legacy /sorteos/plataforma tiene noindex', () => {
    const src = read('src/app/sorteos/plataforma/layout.tsx');
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  });
});

describe('[sorteos-routes] navegación no usa URLs legacy', () => {
  it('CreatorDropdown navega a /sorteos/{slug}, no a /sorteos/plataforma?creador=', () => {
    const src = read('src/features/giveaway-platform/components/CreatorDropdown.tsx');
    expect(src).toMatch(/router\.push\(`\/sorteos\/\$\{slug\}`/);
    expect(src).not.toMatch(/\/sorteos\/plataforma\?creador=/);
  });
  it('CreatorSwitcher navega a /sorteos/{slug}', () => {
    const src = read('src/features/giveaway-platform/components/CreatorSwitcher.tsx');
    expect(src).toMatch(/router\.push\(`\/sorteos\/\$\{slug\}`/);
    expect(src).not.toMatch(/\/sorteos\/plataforma\?creador=/);
  });
  it('PlatformNav logo apunta a /sorteos y ya NO dice "Plataforma de Sorteos"', () => {
    const src = read('src/features/giveaway-platform/components/PlatformNav.tsx');
    expect(src).toMatch(/Link\s+href="\/sorteos"[\s\S]{0,120}gp-logo/);
    expect(src).not.toMatch(/Plataforma de Sorteos/);
  });
  it('steamLogout redirige a /sorteos', () => {
    const src = read('src/features/giveaway-platform/actions/steamLogout.ts');
    expect(src).toMatch(/redirect\('\/sorteos'\)/);
    expect(src).not.toMatch(/redirect\('\/sorteos\/plataforma'\)/);
  });
  it('UserPill enlaza al perfil canónico /sorteos/perfil', () => {
    const src = read('src/features/giveaway-platform/components/UserPill.tsx');
    expect(src).toMatch(/href="\/sorteos\/perfil"/);
    expect(src).not.toMatch(/\/sorteos\/plataforma\/perfil/);
  });
  it('updateProfile revalida /sorteos/perfil (nueva canónica)', () => {
    const src = read('src/features/giveaway-platform/actions/updateProfile.ts');
    expect(src).toMatch(/revalidatePath\('\/sorteos\/perfil'\)/);
  });
});

describe('[sorteos-routes] providers reales — no inventar bindings', () => {
  it('creator-bindings.ts mapea zacketizor + imantado → keydrop', () => {
    const src = read('src/lib/external-giveaways/creator-bindings.ts');
    expect(src).toMatch(/^\s*zacketizor\s*:/m);
    expect(src).toMatch(/^\s*imantado\s*:/m);
    expect(src).toMatch(/provider:\s*'keydrop'/);
    // Los otros creadores del roster NO deben tener binding.
    for (const slug of ['naow', 'huasopeek', 'todocs2', 'jolu']) {
      expect(src).not.toMatch(new RegExp(`^\\s*${slug}\\s*:`, 'm'));
    }
  });
  it('el índice muestra placeholder honesto para creadores sin binding', () => {
    const src = read('src/app/sorteos/page.tsx');
    expect(src).toMatch(/Provider próximamente/);
  });
});

describe('[sorteos-routes] chrome público desactivado en /sorteos/*', () => {
  const src = read('src/components/layout/PublicChrome.tsx');
  it('PORTAL_PREFIXES incluye /sorteos (toda la sección)', () => {
    expect(src).toMatch(/PORTAL_PREFIXES\s*=\s*\[[\s\S]{0,400}'\/sorteos'/);
    // El prefijo antiguo específico ya no está.
    expect(src).not.toMatch(/'\/sorteos\/plataforma'/);
  });
});

describe('[sorteos-routes] páginas legales siguen bajo /sorteos/(legal)/', () => {
  // Fase 0 legal:
  //   - juego-responsable → participacion-responsable (renombre + redirect 301).
  //   - Añadidas recompensas-y-puntos y partners-externos.
  const routes = [
    'faq',
    'terminos',
    'privacidad',
    'participacion-responsable',
    'recompensas-y-puntos',
    'partners-externos',
  ];
  for (const r of routes) {
    it(`/sorteos/${r} sigue existiendo`, () => {
      const src = read(`src/app/sorteos/(legal)/${r}/page.tsx`);
      expect(src).toMatch(/export default (async )?function/);
      expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
    });
  }
  it('PlatformFooter enlaza a todas las legales activas', () => {
    const src = read('src/features/giveaway-platform/components/PlatformFooter.tsx');
    for (const r of routes) {
      expect(src).toMatch(new RegExp(`href="/sorteos/${r}"`));
    }
  });
  it('/sorteos/juego-responsable es un redirect legacy (no expone contenido)', () => {
    const src = read('src/app/sorteos/(legal)/juego-responsable/page.tsx');
    expect(src).toMatch(/redirect\(\s*['"]\/sorteos\/participacion-responsable['"]\s*\)/);
  });
});
