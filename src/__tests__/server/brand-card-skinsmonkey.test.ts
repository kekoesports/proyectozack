/**
 * Card SkinsMonkey v2 — compacta con media-block a la derecha.
 *
 * Historial:
 *  - v0 (original): agente flotante 220x280 con object-fit contain. Thumbnail
 *    de gstatic quedaba pequeño y aplastado.
 *  - v1 (PR #176): patrón hero-top a ancho completo. Rechazado por el
 *    usuario porque descompensaba la fila `.gp-grid-2` (CSGO-SKINS quedaba
 *    enorme con espacio vacío).
 *  - v2 (este): mismo min-height que CSGO-SKINS. Media block a la derecha
 *    con máscara lateral que funde la foto con el contenido.
 *
 * Contratos verificados:
 *  - La card ya no usa `.p-monkey` (v1). Usa `.p-monkey-v2`.
 *  - Ya no existe el bloque hero-top `.gp-monkey-hero` ni el overlay.
 *  - Nuevo `.gp-monkey-media` (posicionado absolute, mask-image lateral).
 *  - Nuevo `.gp-monkey-content` con max-width para que texto y foto no
 *    se solapen.
 *  - Altura de la card queda igual a CSGO-SKINS (hereda min-height de
 *    `.p-gold`, no lo override).
 *  - Otras cards (KeyDrop, CSGO-SKINS, Skin.Club) intactas.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[brand-card-skinsmonkey v2] revert de hero-top y patrón compacto', () => {
  const src = read('src/features/giveaway-platform/components/BrandCardSkinsMonkey.tsx');

  it('la card usa `.p-monkey-v2` (no `.p-monkey` ni hero-top) y hereda `.gp-card-led`', () => {
    // La lista de clases incluye .gp-card, .gp-card-led (borde LED
    // por marca), .p-gold y .p-monkey-v2. Toleramos cualquier orden.
    expect(src).toMatch(/className="[^"]*\bp-monkey-v2\b[^"]*"/);
    expect(src).toMatch(/className="[^"]*\bp-gold\b[^"]*"/);
    expect(src).toMatch(/className="[^"]*\bgp-card-led\b[^"]*"/);
    // La modificadora v1 (hero-top) debe estar fuera.
    expect(src).not.toMatch(/className="gp-card\s+p-gold\s+p-monkey"/);
    expect(src).not.toMatch(/\bp-monkey\b(?!-v2)/);
  });

  it('YA NO existe el bloque hero-top `.gp-monkey-hero`', () => {
    expect(src).not.toMatch(/gp-monkey-hero\b/);
    expect(src).not.toMatch(/gp-monkey-hero-img/);
    expect(src).not.toMatch(/gp-monkey-hero-overlay/);
  });

  it('YA NO existe el body full-width v1 `.gp-monkey-body`', () => {
    expect(src).not.toMatch(/gp-monkey-body\b/);
  });

  it('renderiza `.gp-monkey-media` como <div> con `<Image fill sizes="240px">`', () => {
    expect(src).toMatch(/<div\s+className="gp-monkey-media"\s+aria-hidden>/);
    expect(src).toMatch(/<Image[\s\S]{0,200}fill[\s\S]{0,120}sizes="240px"[\s\S]{0,120}gp-monkey-media-img/);
  });

  it('el contenido vive dentro de `.gp-monkey-content` (para el max-width lateral)', () => {
    expect(src).toMatch(/<div className="gp-monkey-content">/);
  });

  it('mantiene logo + copy + oferta + CTA sin cambios funcionales', () => {
    expect(src).toMatch(/gp-brand-logo/);
    expect(src).toMatch(/Compra e intercambia skins de forma rápida y segura/);
    expect(src).toMatch(/pill-offer[^"]*"[\s\S]{0,200}35% Bonus \+ hasta 5\$ Gratis/);
    expect(src).toMatch(/Reclamar/);
  });
});

describe('[brand-card-skinsmonkey v2] CSS del patrón compacto', () => {
  const css = read('src/app/sorteos/plataforma/platform-brand-cards.css');

  it('`.p-monkey-v2` es position relative + overflow hidden — sin override de padding ni de min-height', () => {
    expect(css).toMatch(/\.p-monkey-v2\s*\{[\s\S]{0,200}position:\s*relative/);
    expect(css).toMatch(/\.p-monkey-v2\s*\{[\s\S]{0,200}overflow:\s*hidden/);
    // La v1 hacía `.p-monkey { padding: 0 }` para permitir hero — ya no está.
    expect(css).not.toMatch(/\.p-monkey-v2\s*\{[\s\S]{0,300}padding:\s*0/);
    // Y no override el min-height (hereda 300px de `.p-gold`).
    expect(css).not.toMatch(/\.p-monkey-v2\s*\{[\s\S]{0,300}min-height:\s*\d/);
  });

  it('YA NO existen los selectores del hero-top v1', () => {
    expect(css).not.toMatch(/\.gp-monkey-hero\b/);
    expect(css).not.toMatch(/\.gp-monkey-hero-img/);
    expect(css).not.toMatch(/\.gp-monkey-hero-overlay/);
    expect(css).not.toMatch(/\.gp-monkey-body/);
  });

  it('`.gp-monkey-media` es un bloque lateral pequeño (absolute + width porcentual + max-width)', () => {
    expect(css).toMatch(/\.gp-monkey-media\s*\{[\s\S]{0,400}position:\s*absolute/);
    expect(css).toMatch(/\.gp-monkey-media\s*\{[\s\S]{0,400}width:\s*\d+%/);
    expect(css).toMatch(/\.gp-monkey-media\s*\{[\s\S]{0,400}max-width:\s*\d+px/);
    expect(css).toMatch(/\.gp-monkey-media\s*\{[\s\S]{0,400}overflow:\s*hidden/);
  });

  it('máscara lateral funde la foto con el contenido (linear-gradient lateral en mask-image)', () => {
    expect(css).toMatch(/\.gp-monkey-media\s*\{[\s\S]{0,600}mask-image:\s*linear-gradient\(90deg/);
  });

  it('`.gp-monkey-media-img` usa object-fit cover + object-position right center', () => {
    expect(css).toMatch(/\.gp-monkey-media-img\s*\{[\s\S]{0,250}object-fit:\s*cover/);
    expect(css).toMatch(/\.gp-monkey-media-img\s*\{[\s\S]{0,250}object-position:\s*right\s+center/);
  });

  it('`.gp-monkey-content` limita el ancho para no chocar con la foto', () => {
    expect(css).toMatch(/\.gp-monkey-content\s*\{[\s\S]{0,200}max-width:\s*\d+%/);
    // Z-index más alto que el media.
    expect(css).toMatch(/\.gp-monkey-content\s*\{[\s\S]{0,200}z-index:\s*2/);
  });

  it('mobile ≤480px reordena la foto arriba con máscara vertical y opacidad reducida', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)[\s\S]{0,600}\.gp-monkey-media\s*\{[\s\S]{0,400}mask-image:\s*linear-gradient\(180deg/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)[\s\S]{0,600}\.gp-monkey-media\s*\{[\s\S]{0,400}opacity:/);
  });
});

describe('[brand-card-skinsmonkey v2] otras cards intactas', () => {
  it('KeyDrop sigue usando .p-keydrop', () => {
    const src = read('src/features/giveaway-platform/components/BrandCardKeyDrop.tsx');
    expect(src).toMatch(/p-keydrop/);
    expect(src).not.toMatch(/p-monkey-v2/);
  });

  it('CSGO-SKINS sigue usando .p-red (misma altura que hereda)', () => {
    const src = read('src/features/giveaway-platform/components/BrandCardCsgoskins.tsx');
    expect(src).toMatch(/p-red/);
    expect(src).not.toMatch(/p-monkey-v2/);
  });

  it('Skin.Club sigue usando .p-skinclub', () => {
    const src = read('src/features/giveaway-platform/components/BrandCardSkinClub.tsx');
    expect(src).toMatch(/p-skinclub/);
    expect(src).not.toMatch(/p-monkey-v2/);
  });
});
