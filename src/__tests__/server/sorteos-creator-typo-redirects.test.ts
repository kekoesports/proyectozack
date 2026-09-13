/** The published September route uses jolucs2 as canonical and preserves old links. */

import * as fs from 'fs';
import * as path from 'path';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PAGE_SOURCE = fs.readFileSync(
  path.join(ROOT, 'src/app/sorteos/[creatorSlug]/page.tsx'),
  'utf8',
);

describe('/sorteos/[creatorSlug] — redirect defensivo por typo', () => {
  it('SLUG_TYPO_REDIRECTS mantiene jolu → jolucs2', () => {
    // Buscamos la entrada explícita del mapa, sea con comillas simples o
    // dobles. Tolerante a formato pero estricto en la relación typo→slug.
    expect(PAGE_SOURCE).toMatch(/jolu\s*:\s*['"]jolucs2['"]/);
  });

  it('SLUG_TYPO_REDIRECTS mantiene también jolucs y jolu-cs2 apuntando a jolu', () => {
    expect(PAGE_SOURCE).toMatch(/['"]?jolucs['"]?\s*:\s*['"]jolucs2['"]/);
    expect(PAGE_SOURCE).toMatch(/['"]jolu-cs2['"]\s*:\s*['"]jolucs2['"]/);
  });

  it('el slug canónico "jolu" está en PLATFORM_CREATOR_SLUGS', () => {
    // Si alguien saca jolu del roster sin quitar el redirect,
    // /sorteos/jolucs2 → redirect /sorteos/jolu → notFound (regresión).
    expect(PLATFORM_CREATOR_SLUGS).toContain('jolucs2');
  });

  it('la page hace `redirect(target ? ... : "/sorteos")` — no notFound directo', () => {
    // Estructura del guard: primero se resuelve el typo (redirect), y
    // sólo si no es un typo conocido pasa al chequeo contra
    // PLATFORM_CREATOR_SLUGS que puede llamar a `notFound()`.
    expect(PAGE_SOURCE).toMatch(/hasOwnProperty\.call\(SLUG_TYPO_REDIRECTS,\s*slugLc\)/);
    expect(PAGE_SOURCE).toMatch(/redirect\(target\s*\?\s*[`"]\/sorteos\/\$\{target\}[`"]\s*:\s*['"]\/sorteos['"]\)/);
  });

  it('los typos del roster nuevo (2026-07-03) siguen todos presentes', () => {
    // Regresión anti-cleanup accidental de los defensivos que ya se han
    // demostrado útiles en tráfico real.
    const requiredTypos: readonly string[] = [
      'jolu', 'jolucs', 'jolu-cs2',
      'todo', 'todocs', 'todo-cs2',
      'imantao', 'imanta',
      'zackezitor', 'zacketizador',
      'huaso', 'huasopeak',
      'naaw',
    ];
    for (const typo of requiredTypos) {
      // Aceptamos con o sin quotes en la key porque las keys tipo
      // `jolucs2:` van sin comillas, y las que llevan guion `'jolu-cs2':`
      // llevan comillas.
      const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const withQuotes = new RegExp(`['"]${escapedTypo}['"]\\s*:`);
      const bareKey = new RegExp(`\\b${escapedTypo}\\s*:`);
      const found = withQuotes.test(PAGE_SOURCE) || bareKey.test(PAGE_SOURCE);
      expect(found).toBe(true);
    }
  });

  it('los slugs retirados apuntan a "" para que la page redirija al índice', () => {
    // martinez y martines fueron retirados en 2026-07-03. La convención
    // del código: target='' → redirect a '/sorteos' (no a un notFound).
    expect(PAGE_SOURCE).toMatch(/martinez\s*:\s*['"]{2}/);
    expect(PAGE_SOURCE).toMatch(/martines\s*:\s*['"]{2}/);
  });
});
