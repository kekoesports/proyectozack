/**
 * Contratos estructurales de la Fase 1+2 de la economía de puntos.
 *
 * Naming (2026-07-03): al usuario público se le habla siempre de "puntos".
 * Internamente (DB, código, tests) se conservan los identificadores
 * heredados (`coin_transactions`, `getCoinBalance`, `ENTRY_COIN_REWARD`,
 * `costCoins`...) porque renombrarlos requeriría migración DB.
 *
 * Regla interna (docs/sorteos-coin-economy.md):
 *   1 USD ≈ 1.000 puntos · 1 EUR ≈ 1.100 puntos.
 *   Nunca exponer esta conversión al usuario ni permitir
 *   comprar/transferir puntos.
 *
 * Este test verifica:
 *  - Doc existe con las tablas y reglas.
 *  - Tipo ShopCategory ampliado (profile/frame/badge) sin migración.
 *  - PlatformShop muestra las nuevas categorías + disclaimer legal.
 *  - Seed script actualizado con nueva economía + profile cards demo
 *    (NO se ejecuta desde este PR).
 *  - Sin fugas: nadie expone "1$ = 1000 puntos" en UI pública ni existe
 *    endpoint de "comprar puntos" o "transferir puntos".
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[coin-economy] doc de política', () => {
  const doc = read('docs/sorteos-coin-economy.md');

  it('existe y cita la regla interna 1$ ≈ 1.000 puntos', () => {
    expect(doc).toMatch(/1 USD de coste interno\s*≈\s*1\.?000 puntos/i);
    expect(doc).toMatch(/1 EUR de coste interno\s*≈\s*1\.?100 puntos/i);
  });

  it('deja claro que la regla NUNCA se expone al usuario', () => {
    expect(doc).toMatch(/Prohibido exponer al usuario/i);
    expect(doc).toMatch(/No mostrar "1\.000 puntos\s*=\s*1\$"/);
  });

  it('reglas legales completas de "no valor monetario"', () => {
    expect(doc).toMatch(/sin valor monetario/i);
    expect(doc).toMatch(/No son criptomonedas/i);
    expect(doc).toMatch(/No son transferibles/i);
    expect(doc).toMatch(/No pueden venderse/i);
    expect(doc).toMatch(/No son canjeables por dinero/i);
  });

  it('disclaimer largo con el copy compliance completo', () => {
    // Frase canónica que se copiará literal en Términos + FAQ.
    expect(doc).toMatch(
      /Los puntos son un sistema interno de fidelización y recompensas[\s\S]{0,200}No son dinero, no son criptomonedas, no tienen valor monetario, no son transferibles y no pueden canjearse por efectivo/,
    );
  });

  it('incluye tabla de rewards y precios objetivo', () => {
    expect(doc).toMatch(/Racha 7 días completada[\s\S]{0,80}250 puntos/i);
    expect(doc).toMatch(/Gift card 10€[\s\S]{0,120}11\.?000-15\.?000/i);
    expect(doc).toMatch(/Skin CS2 premium/i);
  });

  it('sección profile cards MVP + qué falta para equipar', () => {
    expect(doc).toMatch(/Profile Card\s*—\s*Neon Pink/);
    expect(doc).toMatch(/Profile Card\s*—\s*Gold Elite/);
    expect(doc).toMatch(/qué falta para "equipar" cosméticos/i);
    // Deja constancia de que hace falta migración.
    expect(doc).toMatch(/Migración pendiente/i);
    expect(doc).toMatch(/ALTER TABLE player_profiles/);
  });

  it('roadmap con fases claras y qué requiere migración', () => {
    expect(doc).toMatch(/Fase 1[\s\S]{0,80}\| No/);
    expect(doc).toMatch(/Fase 2[\s\S]{0,120}\| No/);
    expect(doc).toMatch(/Fase 3[\s\S]{0,120}\| \*\*Sí\*\*/);
  });
});

describe('[coin-economy] tipos + DB (sin migración)', () => {
  it('ShopCategory amplía a profile/frame/badge en TypeScript', () => {
    const src = read('src/types/giveawayPlatform.ts');
    expect(src).toMatch(/type ShopCategory\s*=[\s\S]{0,120}'profile'/);
    expect(src).toMatch(/type ShopCategory\s*=[\s\S]{0,120}'frame'/);
    expect(src).toMatch(/type ShopCategory\s*=[\s\S]{0,120}'badge'/);
  });

  it('los strings nuevos caben en el varchar(10) actual (sin migración)', () => {
    for (const cat of ['profile', 'frame', 'badge'] as const) {
      expect(cat.length).toBeLessThanOrEqual(10);
    }
  });

  it('el schema shop_items sigue con category varchar length 10 — no se toca', () => {
    const src = read('src/db/schema/shopItems.ts');
    expect(src).toMatch(/category:\s*varchar\('category',\s*\{\s*length:\s*10\s*\}\)/);
  });
});

describe('[coin-economy] PlatformShop UI', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');

  it('CATEGORIES incluye las 3 nuevas cosméticas', () => {
    expect(src).toMatch(/key:\s*'profile',\s*label:\s*'🎨 Profile Cards'/);
    expect(src).toMatch(/key:\s*'frame',\s*label:\s*'🖼️ Avatar Frames'/);
    expect(src).toMatch(/key:\s*'badge',\s*label:\s*'🏅 Badges'/);
  });

  it('renderiza disclaimer legal público — sin valor monetario', () => {
    expect(src).toMatch(/gp-shop-disclaimer/);
    expect(src).toMatch(/sin valor monetario/);
    expect(src).toMatch(/no\s+transferibles/i);
    expect(src).toMatch(/no canjeables por dinero/i);
  });

  it('el disclaimer NUNCA cita la conversión interna (fuga bloqueada)', () => {
    expect(src).not.toMatch(/1\.?000 puntos\s*=\s*1\s*\$/i);
    expect(src).not.toMatch(/1\.?100 puntos\s*=\s*1\s*€/i);
    expect(src).not.toMatch(/1\s*USD.*1\.?000/i);
    expect(src).not.toMatch(/valor.*€|valor.*USD/i);
  });

  it('CSS del disclaimer existe con dashed border', () => {
    const css = read('src/app/sorteos/plataforma/platform-widgets.css');
    expect(css).toMatch(/\.gp-shop-disclaimer\s*\{[\s\S]{0,400}border:\s*1px\s+dashed/);
  });
});

describe('[coin-economy] seed script actualizado — NO ejecutado desde el PR', () => {
  const src = read('scripts/seed-giveaway-platform.ts');

  it('cita el doc y advierte que no se ejecuta automáticamente', () => {
    expect(src).toMatch(/docs\/sorteos-coin-economy\.md/);
    expect(src).toMatch(/NO se ejecuta automáticamente/);
  });

  it('precios reajustados a la nueva economía', () => {
    expect(src).toMatch(/Tarjeta Steam 10€[\s\S]{0,200}costCoins:\s*11000/);
    expect(src).toMatch(/Tarjeta Steam 20€[\s\S]{0,200}costCoins:\s*22000/);
    expect(src).toMatch(/Tarjeta Steam 50€[\s\S]{0,200}costCoins:\s*55000/);
    expect(src).toMatch(/AK-47 · Redline[\s\S]{0,200}costCoins:\s*15000/);
  });

  it('los 4 Profile Cards MVP existen con precios en rango del doc', () => {
    expect(src).toMatch(/Profile Card — Neon Pink[\s\S]{0,200}costCoins:\s*1500/);
    expect(src).toMatch(/Profile Card — Cyber Blue[\s\S]{0,200}costCoins:\s*2500/);
    expect(src).toMatch(/Profile Card — Gold Elite[\s\S]{0,200}costCoins:\s*5000/);
    expect(src).toMatch(/Profile Card — Inferno[\s\S]{0,200}costCoins:\s*8000/);
  });

  it('todos los precios de profile card están en rango 1.500-10.000', () => {
    const matches = Array.from(src.matchAll(/category:\s*'profile'[\s\S]{0,200}costCoins:\s*(\d+)/g));
    expect(matches.length).toBeGreaterThanOrEqual(4);
    for (const m of matches) {
      const cost = Number(m[1]);
      expect(cost).toBeGreaterThanOrEqual(1500);
      expect(cost).toBeLessThanOrEqual(10000);
    }
  });

  it('avatar frames + badges añadidos también', () => {
    expect(src).toMatch(/category:\s*'frame'[\s\S]{0,80}Avatar Frame — Cyan/);
    expect(src).toMatch(/category:\s*'badge'[\s\S]{0,80}Badge — OG Member/);
  });
});

describe('[coin-economy] safeguards — ningún vector prohibido en código', () => {
  const SRC_PATHS = [
    'src/features/giveaway-platform/components/PlatformShop.tsx',
    'src/app/sorteos/plataforma/actions.ts',
    'src/app/sorteos/page.tsx',
    'src/features/giveaway-platform/components/PlatformCreatorLanding.tsx',
  ];

  it('ningún componente/action ofrece "comprar puntos/monedas" con dinero', () => {
    for (const p of SRC_PATHS) {
      const src = read(p);
      expect(src).not.toMatch(/comprar puntos/i);
      expect(src).not.toMatch(/comprar monedas/i);
      expect(src).not.toMatch(/purchase coins/i);
      expect(src).not.toMatch(/buy coins/i);
    }
  });

  it('ningún componente/action ofrece "transferir puntos/monedas" entre usuarios', () => {
    for (const p of SRC_PATHS) {
      const src = read(p);
      expect(src).not.toMatch(/transferir puntos/i);
      expect(src).not.toMatch(/transferir monedas/i);
      expect(src).not.toMatch(/transfer coins/i);
      expect(src).not.toMatch(/enviar puntos/i);
      expect(src).not.toMatch(/enviar monedas/i);
    }
  });

  it('ningún componente/action ofrece "marketplace" P2P', () => {
    for (const p of SRC_PATHS) {
      const src = read(p);
      expect(src).not.toMatch(/marketplace/i);
      expect(src).not.toMatch(/vender puntos/i);
      expect(src).not.toMatch(/vender monedas/i);
    }
  });

  it('las Server Actions no aceptan money-in por externos (sin depósitos)', () => {
    const actions = read('src/app/sorteos/plataforma/actions.ts');
    // El fetch de sorteos externos no debe usar awardCoins ni insertar
    // en coin_transactions con source distinto a los internos.
    expect(actions).not.toMatch(/keydrop.*insert.*coin_transactions/i);
    expect(actions).not.toMatch(/external.*award/i);
  });
});
