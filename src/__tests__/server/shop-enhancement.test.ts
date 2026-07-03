/**
 * Contratos estructurales de la tienda enriquecida (PlatformShop).
 *
 * Verifica:
 *  - Resumen superior con saldo actual + próximo premio a tu alcance.
 *  - Category tabs con badge de count.
 *  - Card marca "affordable" cuando balance >= cost && stock > 0.
 *  - Barra de progreso por card (% balance/cost, clamped 100).
 *  - Botón muestra "Faltan N ⭐" cuando no alcanza.
 *  - Empty state cuando el filtro no devuelve items.
 *  - CSS para summary, badges y progress-fill.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[shop-enhancement] componente', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');

  it('resume el saldo actual y el gap hacia el próximo canjeable', () => {
    expect(src).toMatch(/gp-shop-summary/);
    expect(src).toMatch(/gp-shop-balance/);
    expect(src).toMatch(/cheapestUnaffordable/);
    expect(src).toMatch(/cheapestUnaffordable\.costCoins\s*-\s*balance/);
  });

  it('cheapestUnaffordable escoge el item más barato con stock>0 fuera del balance', () => {
    expect(src).toMatch(/i\.stock\s*>\s*0\s*&&\s*i\.costCoins\s*>\s*balance/);
    expect(src).toMatch(/a\.costCoins\s*<=\s*b\.costCoins\s*\?\s*a\s*:\s*b/);
  });

  it('tabs muestran count por categoría', () => {
    expect(src).toMatch(/gp-shop-tab-count/);
    expect(src).toMatch(/counts\[c\.key\]/);
  });

  it('card marca affordable cuando balance >= cost && stock > 0', () => {
    expect(src).toMatch(/const\s+affordable\s*=\s*balance\s*>=\s*item\.costCoins\s*&&\s*item\.stock\s*>\s*0/);
    expect(src).toMatch(/gp-shop-card\$\{affordable\s*\?\s*' affordable'\s*:\s*''\}/);
  });

  it('barra de progreso clamped a 100 usando Math.max(1, cost) para evitar /0', () => {
    expect(src).toMatch(/Math\.min\(100,\s*Math\.round\(\(balance\s*\/\s*Math\.max\(1,\s*item\.costCoins\)\)\s*\*\s*100\)\)/);
  });

  it('botón muestra "Faltan N" cuando no puede canjear', () => {
    expect(src).toMatch(/Faltan\s*\$\{\(item\.costCoins\s*-\s*balance\)/);
  });

  it('empty state cuando visible.length === 0', () => {
    // Post-rebrand: "No hay recompensas en esta categoría" reemplaza al
    // "No hay artículos" original.
    expect(src).toMatch(/visible\.length\s*===\s*0\s*\?[\s\S]{0,200}No hay recompensas/);
  });
});

describe('[shop-enhancement] CSS', () => {
  const css = read('src/app/sorteos/plataforma/platform-widgets.css');

  it('.gp-shop-summary con borde gold + flex layout', () => {
    expect(css).toMatch(/\.gp-shop-summary\s*\{[\s\S]{0,400}rgba\(245,\s*183,\s*61/);
  });

  it('.gp-shop-card.affordable con acento verde', () => {
    expect(css).toMatch(/\.gp-shop-card\.affordable\s*\{[\s\S]{0,300}rgba\(74,\s*222,\s*128/);
  });

  it('.gp-shop-badge posicionado top-right con acento verde', () => {
    expect(css).toMatch(/\.gp-shop-badge\s*\{[\s\S]{0,400}position:\s*absolute/);
    expect(css).toMatch(/\.gp-shop-badge\s*\{[\s\S]{0,400}rgba\(74,\s*222,\s*128/);
  });

  it('.gp-shop-progress-fill usa gradient naranja→gold', () => {
    expect(css).toMatch(/\.gp-shop-progress-fill\s*\{[\s\S]{0,300}linear-gradient\([\s\S]{0,80}var\(--sp-orange\)[\s\S]{0,80}var\(--gold\)/);
  });

  it('.gp-shop-tab-count define pill con background', () => {
    expect(css).toMatch(/\.gp-shop-tab-count\s*\{[\s\S]{0,300}border-radius:\s*999px/);
  });
});
