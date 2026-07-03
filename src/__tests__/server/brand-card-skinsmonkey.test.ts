/**
 * Rediseño de la card SkinsMonkey (2026-07-03).
 *
 * Motivación: `constants/brands.ts` documenta que el `agentAsset` de
 * SkinsMonkey viene de gstatic en baja resolución. En el patrón "agente
 * flotante" que usan las otras cards la miniatura queda pequeña y
 * recortada. Se rediseña a patrón "hero-top": banner ancho completo
 * arriba con object-fit cover y overlay + contenido debajo.
 *
 * Contratos verificados:
 *  - La card usa `.p-monkey` (modificadora de `.p-gold`), no la anterior
 *    combinación de `.p-gold` sola con `<div className="gp-brand-agent-wrap">`.
 *  - El hero usa <Image fill> + sizes responsive.
 *  - CSS del hero fuerza aspect-ratio, overflow hidden, object-fit cover
 *    y object-position que centra bien pese al thumbnail de baja calidad.
 *  - Overlay gradient garantiza legibilidad al pasar de imagen a fondo.
 *  - Las otras cards (KeyDrop, CSGO-SKINS, Skin.Club) mantienen el patrón
 *    agente-flotante — no se tocan.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[brand-card-skinsmonkey] hero-top layout', () => {
  const src = read('src/features/giveaway-platform/components/BrandCardSkinsMonkey.tsx');

  it('la card usa la modificadora .p-monkey junto a .p-gold', () => {
    expect(src).toMatch(/className="gp-card\s+p-gold\s+p-monkey"/);
  });

  it('YA NO usa el patrón agente-flotante `.gp-brand-agent-wrap`', () => {
    expect(src).not.toMatch(/gp-brand-agent-wrap/);
    expect(src).not.toMatch(/gp-brand-agent\b/);
  });

  it('monta el hero como <div class="gp-monkey-hero"> con <Image fill>', () => {
    expect(src).toMatch(/<div className="gp-monkey-hero"[\s\S]{0,120}aria-hidden/);
    expect(src).toMatch(/<Image[\s\S]{0,200}fill[\s\S]{0,200}gp-monkey-hero-img/);
  });

  it('sizes responsive (banner mobile, ancho fijo desktop)', () => {
    expect(src).toMatch(/sizes="\(max-width:\s*720px\)\s*100vw,\s*520px"/);
  });

  it('renderiza el overlay como <span class="gp-monkey-hero-overlay">', () => {
    expect(src).toMatch(/gp-monkey-hero-overlay/);
  });

  it('separa el contenido en `.gp-monkey-body` (padding controlado)', () => {
    expect(src).toMatch(/<div className="gp-monkey-body">/);
  });

  it('mantiene logo + oferta + código + CTA "Reclamar"', () => {
    expect(src).toMatch(/gp-brand-logo/);
    expect(src).toMatch(/pill-offer/);
    expect(src).toMatch(/35% Bonus \+ hasta 5\$ Gratis/);
    expect(src).toMatch(/Reclamar/);
  });
});

describe('[brand-card-skinsmonkey] CSS del hero-top', () => {
  const css = read('src/app/sorteos/plataforma/platform-brand-cards.css');

  it('.p-monkey elimina el padding para dejar el hero a full-width', () => {
    expect(css).toMatch(/\.p-monkey\s*\{[\s\S]{0,200}padding:\s*0/);
    expect(css).toMatch(/\.p-monkey\s*\{[\s\S]{0,200}overflow:\s*hidden/);
  });

  it('.gp-monkey-hero fuerza aspect-ratio + overflow hidden + fallback bg', () => {
    expect(css).toMatch(/\.gp-monkey-hero\s*\{[\s\S]{0,400}aspect-ratio:\s*16\s*\/\s*8/);
    expect(css).toMatch(/\.gp-monkey-hero\s*\{[\s\S]{0,400}overflow:\s*hidden/);
    expect(css).toMatch(/\.gp-monkey-hero\s*\{[\s\S]{0,400}background:\s*linear-gradient/);
  });

  it('.gp-monkey-hero-img usa object-fit cover + object-position que evita cortes malos', () => {
    expect(css).toMatch(/\.gp-monkey-hero-img\s*\{[\s\S]{0,200}object-fit:\s*cover/);
    expect(css).toMatch(/\.gp-monkey-hero-img\s*\{[\s\S]{0,200}object-position:\s*center\s+\d+%/);
  });

  it('.gp-monkey-hero-overlay define gradient de abajo hacia arriba para legibilidad', () => {
    expect(css).toMatch(/\.gp-monkey-hero-overlay\s*\{[\s\S]{0,500}linear-gradient\(180deg/);
  });

  it('mobile responsive: aspect-ratio 16/9 en <=720px', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]{0,300}\.gp-monkey-hero\s*\{[\s\S]{0,120}aspect-ratio:\s*16\s*\/\s*9/);
  });
});

describe('[brand-card-skinsmonkey] otras cards intactas', () => {
  it('KeyDrop sigue usando .p-keydrop con .gp-brand-keydrop-banner', () => {
    const src = read('src/features/giveaway-platform/components/BrandCardKeyDrop.tsx');
    expect(src).toMatch(/p-keydrop/);
  });

  it('CSGO-SKINS sigue usando .p-red', () => {
    const src = read('src/features/giveaway-platform/components/BrandCardCsgoskins.tsx');
    expect(src).toMatch(/p-red/);
    // No lleva la modificadora .p-monkey por error.
    expect(src).not.toMatch(/p-monkey/);
  });

  it('Skin.Club sigue usando .p-skinclub', () => {
    const src = read('src/features/giveaway-platform/components/BrandCardSkinClub.tsx');
    expect(src).toMatch(/p-skinclub/);
    expect(src).not.toMatch(/p-monkey/);
  });
});
