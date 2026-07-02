/**
 * PR1 giveaway-platform-v2-shell:
 * Verifica el shell visual sin ejecutar la página (no queremos conectar DB
 * en unit tests). Solo lee archivos y comprueba estructura + contratos.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[PR1] giveaway-platform v2 shell — estructura', () => {
  it('layout.tsx existe con noindex + fonts + ambos CSS', () => {
    const src = read('src/app/sorteos/plataforma/layout.tsx');
    expect(src).toMatch(/from ['"]next\/font\/google['"]/);
    expect(src).toMatch(/Rajdhani/);
    expect(src).toMatch(/Chakra_Petch/);
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
    expect(src).toMatch(/import\s+['"]\.\/platform\.css['"]/);
    expect(src).toMatch(/import\s+['"]\.\/platform-hero\.css['"]/);
    expect(src).toMatch(/import\s+['"]\.\/platform-brand-cards\.css['"]/);
    expect(src).toMatch(/import\s+['"]\.\/platform-fx\.css['"]/);
    expect(src).toMatch(/import\s+['"]\.\/platform-widgets\.css['"]/);
    expect(src).toMatch(/giveaway-platform/);
  });

  it('page.tsx importa PlatformNav, PlatformHero, BrandBonusesSection', () => {
    const src = read('src/app/sorteos/plataforma/page.tsx');
    expect(src).toMatch(/import\s+\{\s*PlatformNav\s*\}/);
    expect(src).toMatch(/import\s+\{\s*PlatformHero\s*\}/);
    expect(src).toMatch(/import\s+\{\s*BrandBonusesSection\s*\}/);
  });

  it('page.tsx renderiza PlatformHero y BrandBonusesSection', () => {
    const src = read('src/app/sorteos/plataforma/page.tsx');
    expect(src).toMatch(/<PlatformHero\s/);
    expect(src).toMatch(/<BrandBonusesSection\s/);
  });
});

describe('[PR1] platform.css — shell scope estricto bajo .giveaway-platform', () => {
  const css = read('src/app/sorteos/plataforma/platform.css');
  const brands = read('src/app/sorteos/plataforma/platform-brand-cards.css');

  function assertScoped(source: string) {
    expect(source).not.toMatch(/^\s*:root\s*\{/m);
    expect(source).not.toMatch(/^\s*html\s*\{/m);
    expect(source).not.toMatch(/^\s*body\s*\{/m);
    const ruleLines = source.split('\n').filter((l) => {
      const t = l.trim();
      if (!t.endsWith('{')) return false;
      if (t.startsWith('@')) return false;
      if (t.startsWith('/*')) return false;
      return true;
    });
    for (const line of ruleLines) {
      expect(line).toMatch(/\.giveaway-platform/);
    }
  }

  it('platform.css: cada regla vive bajo .giveaway-platform', () => assertScoped(css));
  it('platform-brand-cards.css: cada regla vive bajo .giveaway-platform', () => assertScoped(brands));

  it('platform.css define las CSS variables de la paleta SocialPro', () => {
    expect(css).toMatch(/--bg:\s*#0b0a14/);
    expect(css).toMatch(/--sp-orange:\s*#f5632a/);
    expect(css).toMatch(/--sp-pink:\s*#e03070/);
    expect(css).toMatch(/--sp-dpink:\s*#c42880/);
    expect(css).toMatch(/--sp-purple:\s*#8b3aad/);
    expect(css).toMatch(/--sp-grad:/);
    expect(css).toMatch(/--cyan:\s*#28d7ff/);
    expect(css).toMatch(/--gold:\s*#f5b73d/);
  });

  it('platform.css usa las variables de fuente inyectadas por next/font', () => {
    expect(css).toMatch(/var\(--font-rajdhani\)/);
    expect(css).toMatch(/var\(--font-chakra\)/);
  });

  it('ningún archivo CSS del PR supera 500 LOC', () => {
    const cssLines = css.split('\n').length;
    const brandsLines = brands.split('\n').length;
    expect(cssLines).toBeLessThanOrEqual(500);
    expect(brandsLines).toBeLessThanOrEqual(500);
  });
});

describe('[PR1] backend intacto', () => {
  it('actions.ts mantiene contrato + guard mínimo de redemption añadido', () => {
    const src = read('src/app/sorteos/plataforma/actions.ts');
    expect(src).toMatch(/export async function participateInGiveaway/);
    expect(src).toMatch(/export async function claimDailyReward/);
    expect(src).toMatch(/export async function redeemShopItem/);
    // Guard exigido por tsc: !redemption → ok: false, sin ID falso.
    expect(src).toMatch(/if\s*\(!redemption\)\s*return\s*\{\s*ok:\s*false/);
  });

  it('queries/giveawayPlatform.ts no modificado (mantiene getCoinBalance vía SUM)', () => {
    const src = read('src/lib/queries/giveawayPlatform.ts');
    expect(src).toMatch(/export async function getCoinBalance/);
    expect(src).toMatch(/coalesce\(sum\(\$\{coinTransactions\.amount\}\), 0\)/);
  });

  it('no hay nueva migración drizzle en PR1', () => {
    const files = fs.readdirSync(path.join(ROOT, 'drizzle')).filter((f) => f.endsWith('.sql'));
    // 0103_giveaway_platform.sql viene del PR anterior (feat/giveaway-platform), no de PR1.
    expect(files).not.toContain('0104_giveaway_platform_v2_shell.sql');
  });
});

describe('[PR1] constants/brands.ts — 5 partners requeridos', () => {
  const src = read('src/features/giveaway-platform/constants/brands.ts');
  it('exporta las 5 marcas del HTML v2', () => {
    for (const key of ['keydrop', 'csgoskins', 'skinsmonkey', 'skinclub']) {
      expect(src).toMatch(new RegExp(`${key}:\\s*\\{`));
    }
  });
});
