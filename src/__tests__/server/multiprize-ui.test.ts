/**
 * Contratos estructurales del multi-prize UI en ExternalGiveawayCard.
 *
 * Verifica que la card renderiza el strip de miniaturas cuando el sorteo
 * tiene varios premios, y usa los campos `prizesPreview` y `prizeCount`
 * que produce el mapper común.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[multiprize-ui] ExternalGiveawayCard renderiza multi-prize', () => {
  const src = read('src/features/giveaway-platform/components/ExternalGiveawayCard.tsx');

  it('renderiza el strip solo cuando prizeCount > 1', () => {
    expect(src).toMatch(/card\.prizeCount\s*>\s*1[\s\S]{0,200}gp-external-prize-strip/);
  });

  it('itera prizesPreview.slice(1, 5) para las miniaturas', () => {
    expect(src).toMatch(/card\.prizesPreview\.slice\(1,\s*5\)/);
  });

  it('muestra badge "+N" cuando prizeCount > 5', () => {
    expect(src).toMatch(/card\.prizeCount\s*>\s*5[\s\S]{0,120}gp-external-prize-more/);
    expect(src).toMatch(/\+\{card\.prizeCount\s*-\s*5\}/);
  });

  it('cada miniatura usa next/image sin optimizer (CDN provider)', () => {
    // Dentro del bloque del strip debe haber <Image unoptimized ...
    expect(src).toMatch(/gp-external-prize-thumb[\s\S]{0,200}unoptimized/);
  });

  it('imagen principal sigue mostrándose (unchanged)', () => {
    expect(src).toMatch(/card\.imageUrl\s*\?\s*\(\s*<Image\s+src=\{card\.imageUrl\}/);
  });
});

describe('[multiprize-ui] CSS del strip', () => {
  const css = read('src/app/sorteos/plataforma/platform-external-giveaways.css');

  it('define .gp-external-prize-strip como layer superpuesta a la imagen', () => {
    expect(css).toMatch(/\.gp-external-prize-strip\s*\{[\s\S]{0,200}position:\s*absolute/);
  });

  it('define .gp-external-prize-thumb con object-fit contain', () => {
    expect(css).toMatch(/\.gp-external-prize-thumb\s+img\s*\{[\s\S]{0,80}object-fit:\s*contain/);
  });

  it('define .gp-external-prize-more con acento SP pink', () => {
    expect(css).toMatch(/\.gp-external-prize-more\s*\{[\s\S]{0,200}rgba\(224,\s*48,\s*112/);
  });
});
