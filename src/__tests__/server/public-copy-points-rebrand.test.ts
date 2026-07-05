/**
 * Rebrand compliance — el usuario público solo ve "puntos", nunca "monedas".
 *
 * Motivo: por prevención legal/compliance (2026-07-03) evitamos que el
 * sistema interno de fidelización parezca una moneda, token, cripto o
 * valor económico. En UI pública se habla siempre de **puntos SocialPro**.
 *
 * Internamente se conservan los identificadores heredados por evitar
 * migración de DB en este PR:
 *   - Tabla `coin_transactions`
 *   - Funciones `getCoinBalance`, `awardCoins`
 *   - Constantes `ENTRY_COIN_REWARD`, `STREAK_REWARDS`, `costCoins`
 *   - Props/fields `coinsEarned`, `rewardCoins`, `costCoins`
 *
 * Este test verifica que ninguna string visible al usuario contenga
 * "monedas" (o su plural) ni "coins" ni el emoji 🪙 en los archivos de
 * UI pública de `/sorteos`.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

/**
 * Archivos de UI pública de la plataforma de sorteos.
 * NO incluye admin/facturacion (allí "monedas" se refiere a currency
 * financiera USD/EUR, no al sistema de puntos).
 */
const PUBLIC_UI_FILES = [
  'src/app/sorteos/page.tsx',
  'src/app/sorteos/[creatorSlug]/page.tsx',
  'src/app/sorteos/perfil/page.tsx',
  'src/app/sorteos/(legal)/terminos/page.tsx',
  'src/app/sorteos/(legal)/privacidad/page.tsx',
  'src/app/sorteos/(legal)/participacion-responsable/page.tsx',
  'src/app/sorteos/(legal)/recompensas-y-puntos/page.tsx',
  'src/app/sorteos/(legal)/partners-externos/page.tsx',
  'src/app/sorteos/(legal)/faq/page.tsx',
  'src/features/giveaway-platform/components/UserPill.tsx',
  'src/features/giveaway-platform/components/PlatformShop.tsx',
  'src/features/giveaway-platform/components/PlatformCreatorLanding.tsx',
  'src/features/giveaway-platform/components/MissionsGrid.tsx',
  'src/features/giveaway-platform/components/DailyStreakCard.tsx',
] as const;

/**
 * Extrae las partes de un fuente TSX/TS que pueden acabar en pantalla
 * del usuario:
 *   - Contenido dentro de string literals ('...', "...", `...`).
 *   - Contenido de texto en JSX (entre `>` y `<`).
 * Excluye:
 *   - Comentarios `//` y `/* ... *​/`.
 *   - Nombres de clase CSS y de identificadores.
 * Es una heurística — no un parser AST — suficiente para bloquear las
 * strings visibles obvias sin ser demasiado ruidosa.
 */
function extractUserVisibleText(src: string): string {
  // 1. Quitar comentarios de bloque y de línea.
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  // 2. Quitar `className="..."` completas — son clases CSS, no visible text.
  s = s.replace(/className\s*=\s*"[^"]*"/g, '');
  s = s.replace(/className\s*=\s*\{[^}]*\}/g, '');
  // 3. Quitar bloques CSS-like en style={{...}}.
  s = s.replace(/style\s*=\s*\{\{[^}]*\}\}/g, '');
  return s;
}

describe('[points-rebrand] UI pública no muestra "monedas"', () => {
  for (const rel of PUBLIC_UI_FILES) {
    it(`${rel} no contiene la palabra "monedas" en texto visible`, () => {
      const src = read(rel);
      const visible = extractUserVisibleText(src);
      // Case-insensitive por seguridad. Buscamos "moneda" o "monedas".
      expect(visible).not.toMatch(/\bmonedas?\b/i);
    });
  }
});

describe('[points-rebrand] UI pública no muestra "coins/coin"', () => {
  for (const rel of PUBLIC_UI_FILES) {
    it(`${rel} no contiene "coins"/"coin" como palabra visible al usuario`, () => {
      const src = read(rel);
      const visible = extractUserVisibleText(src);
      // Solo bloqueamos "coin"/"coins" como palabra suelta (aria-label,
      // texto JSX, string literal). Nombres internos como costCoins,
      // rewardCoins, ENTRY_COIN_REWARD siguen permitidos porque no
      // aparecen como palabra suelta en el texto visible.
      expect(visible).not.toMatch(/\bcoins?\b/i);
    });
  }
});

describe('[points-rebrand] UI pública no muestra el emoji 🪙', () => {
  for (const rel of PUBLIC_UI_FILES) {
    it(`${rel} no contiene 🪙`, () => {
      const src = read(rel);
      expect(src).not.toContain('🪙');
    });
  }
});

describe('[points-rebrand] icono nuevo ⭐ en su lugar', () => {
  const withStarIcon = [
    'src/features/giveaway-platform/components/UserPill.tsx',
    'src/features/giveaway-platform/components/PlatformShop.tsx',
    'src/features/giveaway-platform/components/PlatformCreatorLanding.tsx',
    'src/features/giveaway-platform/components/MissionsGrid.tsx',
    'src/features/giveaway-platform/components/DailyStreakCard.tsx',
    'src/app/sorteos/perfil/page.tsx',
    'src/app/sorteos/page.tsx',
  ];

  for (const rel of withStarIcon) {
    it(`${rel} usa ⭐ como icono de puntos`, () => {
      const src = read(rel);
      expect(src).toContain('⭐');
    });
  }
});

describe('[points-rebrand] copy legal compliance', () => {
  it('Términos: "Puntos SocialPro" reemplaza a "Monedas virtuales"', () => {
    const src = read('src/app/sorteos/(legal)/terminos/page.tsx');
    // La sección 5 debe titularse con "Puntos SocialPro".
    expect(src).toMatch(/Puntos SocialPro/);
    // Copy canónico de compliance debe estar presente (permite saltos
    // de línea y etiquetas <b> entre partes).
    expect(src).toMatch(/Los puntos son un sistema interno de fidelización y recompensas/);
    expect(src).toMatch(
      /No son dinero, no son criptomonedas, no tienen valor monetario, no son\s+transferibles y no pueden canjearse por efectivo/,
    );
  });

  it('FAQ: sección "Puntos y recompensas" (post rename Tienda → Recompensas)', () => {
    const src = read('src/app/sorteos/(legal)/faq/page.tsx');
    expect(src).toMatch(/title:\s*'Puntos y recompensas'/);
    expect(src).toMatch(/¿Qué son los puntos ⭐\?/);
  });

  it('Participación responsable: aclara que los puntos no tienen valor monetario', () => {
    const src = read('src/app/sorteos/(legal)/participacion-responsable\/page.tsx');
    expect(src).toMatch(/puntos ⭐ son recompensas internas sin valor monetario/);
  });

  it('PlatformShop disclaimer: "Los puntos son recompensas internas sin valor monetario"', () => {
    const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');
    expect(src).toMatch(/Los puntos son recompensas internas.*sin valor monetario/);
    // Y NO menciona "las monedas".
    expect(src).not.toMatch(/[Ll]as monedas/);
  });
});

describe('[points-rebrand] identificadores internos preservados (no requiere migración)', () => {
  it('DB schema coin_transactions sigue existiendo (no se toca)', () => {
    const src = read('src/db/schema/coinTransactions.ts');
    expect(src).toMatch(/coin_transactions/);
  });

  it('getCoinBalance sigue exportado desde queries', () => {
    const src = read('src/lib/queries/giveawayPlatform.ts');
    expect(src).toMatch(/export\s+async\s+function\s+getCoinBalance/);
  });

  it('ENTRY_COIN_REWARD sigue en constants', () => {
    const src = read('src/lib/giveaway-platform/constants.ts');
    expect(src).toMatch(/ENTRY_COIN_REWARD/);
  });

  it('costCoins sigue en el schema de shop_items', () => {
    const src = read('src/db/schema/shopItems.ts');
    expect(src).toMatch(/costCoins/);
  });
});
