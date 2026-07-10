/**
 * Regresión anti-borrado del redirect `jolucs2 → jolu`.
 *
 * El audit del 2026-07-10 (bug B2) reportó `/sorteos/jolucs2` como 404,
 * pero al auditar el estado real: el redirect YA está configurado en
 * `SLUG_TYPO_REDIRECTS['jolucs2'] = 'jolu'` desde 2026-07-03 (misma PR
 * que introdujo el resto del roster), y `jolu` es un talent válido en DB
 * (id=87). El bug estaba obsoleto en el informe.
 *
 * Estos tests bloquean que:
 *   - Alguien borre por accidente la entrada `jolucs2` del mapa de typos.
 *   - Alguien saque `jolu` de `PLATFORM_CREATOR_SLUGS` sin quitar el
 *     redirect (dejaría un enlace a un slug que ya no pinta nada).
 *
 * No verifican la existencia de la fila en DB — eso vive en el seed y
 * está fuera del scope de un test unitario.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PAGE_SOURCE = fs.readFileSync(
  path.join(ROOT, 'src/app/sorteos/[creatorSlug]/page.tsx'),
  'utf8',
);

describe('/sorteos/[creatorSlug] — redirect defensivo por typo', () => {
  it('SLUG_TYPO_REDIRECTS mantiene jolucs2 → jolu', () => {
    // Buscamos la entrada explícita del mapa, sea con comillas simples o
    // dobles. Tolerante a formato pero estricto en la relación typo→slug.
    expect(PAGE_SOURCE).toMatch(/jolucs2\s*:\s*['"]jolu['"]/);
  });

  it('SLUG_TYPO_REDIRECTS mantiene también jolucs y jolu-cs2 apuntando a jolu', () => {
    expect(PAGE_SOURCE).toMatch(/['"]?jolucs['"]?\s*:\s*['"]jolu['"]/);
    expect(PAGE_SOURCE).toMatch(/['"]jolu-cs2['"]\s*:\s*['"]jolu['"]/);
  });

  it('el slug canónico "jolu" está en PLATFORM_CREATOR_SLUGS', () => {
    // Si alguien saca jolu del roster sin quitar el redirect,
    // /sorteos/jolucs2 → redirect /sorteos/jolu → notFound (regresión).
    expect(PLATFORM_CREATOR_SLUGS).toContain('jolu');
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
      'jolucs2', 'jolucs', 'jolu-cs2',
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
      const withQuotes = new RegExp(`['"]${typo.replace(/-/g, '\\-')}['"]\\s*:`);
      const bareKey = new RegExp(`\\b${typo.replace(/-/g, '\\-')}\\s*:`);
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
