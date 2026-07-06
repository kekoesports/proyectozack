/**
 * Copy allowlist para el hub de recompensas.
 *
 * El sponsor exige NO usar en la sección de recompensas:
 *   - depósito
 *   - ticket de pago
 *   - comprar
 *   - monedas
 *   - apuesta
 *   - casino
 *
 * "Puntos", "canjear", "gratis", "participar" están permitidos.
 * Los componentes del hub se auditan aquí para evitar drift en el copy.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const HUB_FILES = [
  'src/features/giveaway-platform/components/RewardsHub.tsx',
  'src/features/giveaway-platform/components/FreeRaffleCard.tsx',
  'src/features/giveaway-platform/components/MonthlyPointsRanking.tsx',
  'src/features/giveaway-platform/components/PrizesBlock.tsx',
  'src/features/giveaway-platform/components/ParticipantsModal.tsx',
] as const;

/**
 * Regex por palabra prohibida. Distinguimos:
 *   - `mon(e|é)da` (moneda/monedas)     — no queremos ese término
 *     PERO permitimos "MONEDAS" solo si aparece en `sp-monedas` u otro
 *     nombre técnico legado. Aquí busco solo en texto visible: entre `>` y `<`.
 */
const FORBIDDEN_WORDS_RE = /\b(depósito|deposito|ticket de pago|comprar|monedas?|apuesta|apostar|casino)\b/i;

describe('[rewards-hub] copy allowlist', () => {
  for (const file of HUB_FILES) {
    it(`${file} — no palabras prohibidas en texto visible`, () => {
      const src = read(file);
      // Extraer contenido visible aproximado — matches entre `>` y `<` en JSX,
      // y strings entre backticks/quotes que sean children props.
      const visibleChunks: string[] = [];
      const jsxTextRe = />([^<>{}]+)</g;
      let m: RegExpExecArray | null;
      while ((m = jsxTextRe.exec(src)) !== null) {
        const text = m[1]!.trim();
        if (text.length > 0) visibleChunks.push(text);
      }
      // También strings de tipo children explícito (>{"..."}<)
      const jsxLiteralsRe = /children[^:]{0,2}:\s*['"`]([^'"`]+)['"`]/g;
      while ((m = jsxLiteralsRe.exec(src)) !== null) {
        visibleChunks.push(m[1]!);
      }
      // Y label/description del CSS class strings ya se descartan; buscamos
      // sólo texto libre.

      for (const chunk of visibleChunks) {
        expect(chunk).not.toMatch(FORBIDDEN_WORDS_RE);
      }
    });
  }

  it('copy obligatorio "Participación gratuita. No consume puntos." aparece en la card', () => {
    const src = read('src/features/giveaway-platform/components/FreeRaffleCard.tsx');
    expect(src).toMatch(/Participación gratuita\. No consume puntos\./);
  });

  it('copy obligatorio del ranking mencion misiones y rachas', () => {
    const src = read('src/features/giveaway-platform/components/MonthlyPointsRanking.tsx');
    expect(src).toMatch(/misiones y rachas/);
  });

  it('las tabs se llaman Recompensas por puntos / Sorteos gratis / Ranking mensual', () => {
    const src = read('src/features/giveaway-platform/components/RewardsHub.tsx');
    expect(src).toMatch(/Recompensas por puntos/);
    expect(src).toMatch(/Sorteos gratis/);
    expect(src).toMatch(/Ranking mensual/);
  });
});
