/**
 * Contratos del script de limpieza legacy + repricing merch SocialPro.
 *
 * Verifica:
 *  - Requiere env var CONFIRM_CLEANUP_LEGACY_SHOP=I_ACCEPT_CLEANUP.
 *  - Nombres exactos de las 3 skins legacy documentados.
 *  - Nuevos precios de merch (Camiseta ≥ 2× de 300 = ≥ 600, Gorra ≥ 2× de 220 = ≥ 440).
 *  - Usa soft-delete (`isActive: false`), NO `db.delete`.
 *  - No toca otros items (no `db.update` sobre shop_items sin `where`).
 *  - Doc no expone conversión € → puntos al usuario.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const SCRIPT_PATH = 'scripts/cleanup-legacy-shop-items.ts';

/**
 * Devuelve solo las líneas de código — filtra comentarios JSDoc y `//`.
 * Los comentarios pueden mencionar identificadores como REAL_STEAM_REWARDS
 * o `redemptions` como contexto sin que el script los toque.
 */
function readCodeOnly(rel: string): string {
  return read(rel)
    .split('\n')
    .filter((l) => !/^\s*\*/.test(l) && !/^\s*\/\/\s/.test(l) && !/^\s*\/\*/.test(l))
    .join('\n');
}

describe('[cleanup-legacy] script existe y requiere confirmación', () => {
  const src = read(SCRIPT_PATH);

  it('usa el token de confirmación exacto', () => {
    expect(src).toMatch(/CONFIRM_CLEANUP_LEGACY_SHOP/);
    expect(src).toMatch(/I_ACCEPT_CLEANUP/);
  });

  it('aborta con exit(1) si la env var no matchea', () => {
    expect(src).toMatch(/if\s*\(confirm\s*!==\s*CONFIRM_TOKEN\)/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });
});

describe('[cleanup-legacy] retira las 3 skins legacy vía soft-delete', () => {
  const src = read(SCRIPT_PATH);

  it('lista los 3 nombres exactos', () => {
    expect(src).toContain('★ Glock-18 · Water Elemental');
    expect(src).toContain('★ USP-S · Kill Confirmed');
    expect(src).toContain('★ AK-47 · Redline');
  });

  it('usa `isActive: false` (soft-delete) — nunca `db.delete`', () => {
    expect(src).toMatch(/isActive:\s*false/);
    // `db.delete` sobre `shopItems` sería peligroso: `redemptions.shop_item_id`
    // es ON DELETE RESTRICT, y hard-delete rompería canjes históricos.
    expect(src).not.toMatch(/db\s*\.delete/);
  });

  it('el update está limitado a las 3 skins vía `inArray`', () => {
    expect(src).toMatch(/inArray\(shopItems\.name/);
  });
});

describe('[cleanup-legacy] repricing merch SocialPro ≥ 2× vs valores anteriores', () => {
  const src = read(SCRIPT_PATH);

  it('Camiseta SocialPro sube a ≥ 600 puntos (2× vs 300)', () => {
    // Ajustamos a un valor ≥ 600.
    const m = src.match(/name:\s*'Camiseta SocialPro',\s*newCostCoins:\s*(\d+)/);
    expect(m).not.toBeNull();
    if (m) expect(Number(m[1])).toBeGreaterThanOrEqual(600);
  });

  it('Gorra SocialPro sube a ≥ 440 puntos (2× vs 220)', () => {
    const m = src.match(/name:\s*'Gorra SocialPro',\s*newCostCoins:\s*(\d+)/);
    expect(m).not.toBeNull();
    if (m) expect(Number(m[1])).toBeGreaterThanOrEqual(440);
  });

  it('el update aplica solo a los items nombrados (no bulk sin where)', () => {
    // Cada update debe llevar un `.where(eq(shopItems.name, name))`.
    expect(src).toMatch(/\.where\(eq\(shopItems\.name,\s*name\)\)/);
    // Verifica que TODOS los `db.update(shopItems)` van seguidos de un
    // `.where(` antes de `.returning(`.
    const updates = src.match(/db\s*\.update\(shopItems\)[\s\S]*?\.returning/g) ?? [];
    expect(updates.length).toBeGreaterThanOrEqual(2);
    for (const u of updates) {
      expect(u).toMatch(/\.where\(/);
    }
  });
});

describe('[cleanup-legacy] no toca otros items (código, comentarios excluidos)', () => {
  const code = readCodeOnly(SCRIPT_PATH);

  it('no importa ni referencia REAL_STEAM_REWARDS en código', () => {
    expect(code).not.toMatch(/import\s*\{[^}]*REAL_STEAM_REWARDS/);
    expect(code).not.toContain('AK-47 | Asiimov');
    expect(code).not.toContain('AWP | Atheris');
  });

  it('no importa ni referencia PLANNED_TEAM_MERCH en código', () => {
    expect(code).not.toMatch(/import\s*\{[^}]*PLANNED_TEAM_MERCH/);
    expect(code).not.toContain('Camiseta Team Vitality');
  });

  it('no toca gift cards ni cosméticos en código', () => {
    expect(code).not.toContain('Tarjeta Steam');
    expect(code).not.toContain('Profile Card');
    expect(code).not.toContain('Avatar Frame');
  });
});

describe('[cleanup-legacy] idempotente y sin efectos colaterales', () => {
  const code = readCodeOnly(SCRIPT_PATH);

  it('NO importa schemas de redemptions ni coin_transactions ni player_profiles', () => {
    expect(code).not.toMatch(/import\s*\{[^}]*redemptions/);
    expect(code).not.toMatch(/import\s*\{[^}]*coinTransactions/);
    expect(code).not.toMatch(/import\s*\{[^}]*playerProfiles/);
  });

  it('no llama db.insert ni db.delete sobre esos schemas', () => {
    expect(code).not.toMatch(/db\s*\.(insert|delete)\(redemptions/);
    expect(code).not.toMatch(/db\s*\.(insert|delete)\(coinTransactions/);
    expect(code).not.toMatch(/db\s*\.(insert|delete)\(playerProfiles/);
  });

  it('el update de precios va con `updatedAt: new Date()`', () => {
    expect(code).toMatch(/updatedAt:\s*new Date\(\)/);
  });
});
