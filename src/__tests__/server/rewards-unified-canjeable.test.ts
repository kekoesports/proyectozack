/**
 * Estructura unificada de la sección Recompensas + flujo de canje de skin.
 *
 * Contrato:
 *  - Un solo grid — sin bloque separado "Próximas en tienda".
 *  - Team merch (`PLANNED_TEAM_MERCH`) se mezcla en el grid como cards
 *    disabled con label "Próximamente".
 *  - Skins requieren Steam Trade URL — la card muestra CTA a
 *    `/sorteos/perfil` cuando el usuario aún no la tiene.
 *  - `redeemShopItem` devuelve `code: 'trade_url_required'` para skins
 *    sin trade URL — el cliente lo mapea a la CTA.
 *  - Al canje exitoso, la UI muestra "Solicitud recibida..." — no un
 *    revalidatePath silencioso.
 *  - Email interno a `info@socialpro.es` se dispara desde la action.
 *  - No se usan logos oficiales de equipos.
 *  - Naming Recompensas + puntos preservado.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[rewards-unified] un solo grid — sin bloque separado', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');

  it('YA no existe la sección "Próximas en tienda"', () => {
    expect(src).not.toMatch(/Próximas en tienda/);
    expect(src).not.toMatch(/gp-rewards-upcoming/);
    expect(src).not.toMatch(/rewards-showcase-title/);
    expect(src).not.toMatch(/ShowcaseCard/);
  });

  it('UpcomingCard sustituye a ShowcaseCard y se renderiza inline en el grid', () => {
    expect(src).toMatch(/function UpcomingCard/);
    // Las cards planned se pintan dentro del mismo `<div className="gp-shop-grid">`.
    // Verificamos que UpcomingCard se referencia dentro del mapper del grid.
    // Nota: `shownUpcoming` es la lista paginada de `visibleUpcoming` tras
    // el corte de "Ver más" (INITIAL_VISIBLE = 8).
    expect(src).toMatch(/shownUpcoming\.map\([\s\S]{0,120}<UpcomingCard/);
  });

  it('tabs incluyen nueva categoría "Merch equipos CS2" (team)', () => {
    expect(src).toMatch(/key:\s*'team',\s*label:\s*'🏆 Merch equipos CS2'/);
  });
});

describe('[rewards-unified] PLANNED_TEAM_MERCH — 11 camisetas sin logos oficiales', () => {
  const src = read('src/features/giveaway-platform/constants/rewards-catalog.ts');

  const teams = [
    'Camiseta Team Vitality',
    'Camiseta Team Spirit',
    'Camiseta FURIA',
    'Camiseta NAVI',
    'Camiseta Aurora',
    'Camiseta G2 Esports',
    'Camiseta 9z',
    'Camiseta MOUZ',
    'Camiseta BetBoom',
    'Camiseta Legacy',
    'Camiseta Fnatic',
  ] as const;

  it('exporta PLANNED_TEAM_MERCH con 11 entradas', () => {
    expect(src).toMatch(/export const PLANNED_TEAM_MERCH:\s*readonly\s+CatalogReward\[\]/);
    for (const team of teams) {
      expect(src).toContain(team);
    }
  });

  it('todas planned + team + null costPoints/stock', () => {
    // El factory `createPlannedTeamMerch` fija todos estos defaults.
    expect(src).toMatch(/function createPlannedTeamMerch/);
    expect(src).toMatch(/status:\s*'planned'/);
    expect(src).toMatch(/costPoints:\s*null/);
    expect(src).toMatch(/stock:\s*null/);
    expect(src).toMatch(/category:\s*'team'/);
  });

  it('description honesta — "Diseño pendiente de confirmación"', () => {
    expect(src).toMatch(/Diseño pendiente de confirmación/);
  });

  it('cada camiseta tiene slug único vía createPlannedTeamMerch', () => {
    // El factory `createPlannedTeamMerch(slug, name)` construye
    // `team-shirt-${slug}` — verificamos que se llame 11 veces con slugs
    // distintos como primer argumento.
    const factoryCalls = src.match(/createPlannedTeamMerch\(\s*'([^']+)'/g) ?? [];
    expect(factoryCalls.length).toBeGreaterThanOrEqual(11);
    const slugs = factoryCalls.map((s) => s.match(/'([^']+)'/)?.[1] ?? '');
    const uniq = new Set(slugs);
    expect(uniq.size).toBeGreaterThanOrEqual(11);
    // Y el prefijo team-shirt- se aplica dentro del factory.
    expect(src).toMatch(/slug:\s*`team-shirt-\$\{slug\}`/);
  });
});

describe('[rewards-unified] Steam Trade URL gate', () => {
  const shopSrc = read('src/features/giveaway-platform/components/PlatformShop.tsx');
  const landingSrc = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');

  it('PlatformShop acepta prop hasSteamTradeUrl: boolean', () => {
    expect(shopSrc).toMatch(/hasSteamTradeUrl:\s*boolean/);
  });

  it('para skins sin trade URL, muestra Link a /sorteos/perfil en lugar de Canjear', () => {
    expect(shopSrc).toMatch(/const\s+needsTradeUrl\s*=\s*isSkin\s*&&\s*!hasSteamTradeUrl/);
    expect(shopSrc).toMatch(/needsTradeUrl\s*&&\s*affordable\s*\?[\s\S]{0,300}<Link\s+href="\/sorteos\/perfil"/);
    expect(shopSrc).toMatch(/Añadir Steam Trade URL/);
  });

  it('PlatformCreatorLanding lee steamTradeUrl del perfil y lo pasa al hub', () => {
    expect(landingSrc).toMatch(/db\.query\.playerProfiles\.findFirst\({[\s\S]{0,300}steamTradeUrl:\s*true/);
    expect(landingSrc).toMatch(/const hasSteamTradeUrl\s*=\s*Boolean\(playerProfile\?\.steamTradeUrl/);
    // Post rewards-hub refactor: la landing pasa hasSteamTradeUrl a RewardsHub,
    // que lo forwarda a PlatformShop en el tab "Recompensas por puntos".
    expect(landingSrc).toMatch(/<RewardsHub[\s\S]{0,400}hasSteamTradeUrl=\{hasSteamTradeUrl\}/);
    const hubSrc = read('src/features/giveaway-platform/components/RewardsHub.tsx');
    expect(hubSrc).toMatch(/<PlatformShop[\s\S]{0,150}hasSteamTradeUrl=\{hasSteamTradeUrl\}/);
  });
});

describe('[rewards-unified] redeemShopItem action', () => {
  const actionsSrc = read('src/app/sorteos/plataforma/actions.ts');

  it('devuelve códigos de error tipados (no strings sueltos)', () => {
    expect(actionsSrc).toMatch(/type RedeemErrorCode\s*=/);
    expect(actionsSrc).toMatch(/'trade_url_required'/);
    expect(actionsSrc).toMatch(/'insufficient_balance'/);
    expect(actionsSrc).toMatch(/'out_of_stock'/);
  });

  it('para skin sin Steam Trade URL devuelve code "trade_url_required"', () => {
    expect(actionsSrc).toMatch(
      /category === 'skin'[\s\S]{0,120}!profile\?\.steamTradeUrl[\s\S]{0,300}code:\s*'trade_url_required'/,
    );
  });

  it('en éxito devuelve requiresManualReview para skin/merch', () => {
    expect(actionsSrc).toMatch(/requiresManualReview:\s*item\.category === 'skin'\s*\|\|\s*item\.category === 'merch'/);
  });

  it('dispara email interno a info@socialpro.es para category=skin', () => {
    expect(actionsSrc).toMatch(/sendRewardRedemptionEmail/);
    expect(actionsSrc).toMatch(/if\s*\(item\.category === 'skin'\)\s*\{[\s\S]{0,600}sendRewardRedemptionEmail/);
  });

  it('el envío del email es fire-and-forget (try/catch, no revierte canje)', () => {
    expect(actionsSrc).toMatch(/try\s*\{[\s\S]{0,600}sendRewardRedemptionEmail[\s\S]{0,600}\}\s*catch/);
  });
});

describe('[rewards-unified] email interno a info@socialpro.es', () => {
  const src = read('src/lib/email.ts');

  it('exporta sendRewardRedemptionEmail', () => {
    expect(src).toMatch(/export async function sendRewardRedemptionEmail/);
  });

  it('el destinatario es info@socialpro.es', () => {
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,1200}to:\s*'info@socialpro\.es'/);
  });

  it('subject menciona la recompensa solicitada', () => {
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,1500}subject[\s\S]{0,200}Nueva recompensa solicitada/);
  });

  it('el cuerpo incluye Steam ID, Trade URL, Redemption ID, precio en puntos', () => {
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,3000}Steam ID/);
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,3000}Steam Trade URL/);
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,3000}Redemption ID/);
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,3000}Precio en puntos/);
  });

  it('los datos PII se escapan con escapeHtml', () => {
    // Verificamos que se usa la utilidad de escape para userEmail, steamName,
    // steamId, tradeUrl dentro del template.
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,2500}escapeHtml\(payload\.userEmail\)/);
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,2500}escapeHtml\(payload\.steamName\)/);
    expect(src).toMatch(/sendRewardRedemptionEmail[\s\S]{0,2500}escapeHtml\(payload\.steamTradeUrl\)/);
  });
});

describe('[rewards-unified] UI mensaje éxito post-canje', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');

  it('setSuccessMsg tras canje exitoso muestra copy de revisión manual', () => {
    expect(src).toMatch(
      /Solicitud recibida\. Revisaremos el canje y enviaremos la recompensa manualmente por Steam Trade Offer/,
    );
  });

  it('no muestra silenciosamente — hay un banner .gp-shop-success', () => {
    expect(src).toMatch(/gp-shop-success/);
  });

  it('CSS del banner success existe', () => {
    const css = read('src/app/sorteos/plataforma/platform-widgets.css');
    expect(css).toMatch(/\.gp-shop-success\s*\{[\s\S]{0,600}rgba\(74,\s*222,\s*128/);
  });

  it('CSS del CTA "Añadir Steam Trade URL" existe', () => {
    const css = read('src/app/sorteos/plataforma/platform-widgets.css');
    expect(css).toMatch(/\.gp-shop-error-cta\s*\{/);
  });
});

describe('[rewards-unified] no logos oficiales de equipos', () => {
  it('imágenes de team merch no referencian assets oficiales de equipos', () => {
    const catalogSrc = read('src/features/giveaway-platform/constants/rewards-catalog.ts');
    // Ningún path de imagen con nombres tipo "team-vitality-logo" etc.
    // El factory usa imageUrl:'' — placeholder visual renderiza tipo team.
    expect(catalogSrc).toMatch(/imageUrl:\s*''/);
    // Y explícitamente NO referencia archivos con nombre de equipo.
    expect(catalogSrc).not.toMatch(/\/images\/rewards\/vitality-logo/);
    expect(catalogSrc).not.toMatch(/\/images\/rewards\/navi-logo/);
    expect(catalogSrc).not.toMatch(/\/images\/rewards\/fnatic-logo/);
  });
});

describe('[rewards-unified] naming Recompensas + puntos preservado', () => {
  const src = read('src/features/giveaway-platform/components/PlatformShop.tsx');
  // Comentarios JSDoc de contexto pueden mencionar "Tienda" (antes) — filtramos.
  const codeOnly = src
    .split('\n')
    .filter((l) => !/^\s*\*/.test(l) && !/^\s*\/\/\s/.test(l))
    .join('\n');

  it('copy visible no dice "Tienda" ni "monedas"', () => {
    expect(codeOnly).not.toMatch(/\bTienda\b|\btienda\b/);
    expect(codeOnly).not.toMatch(/\bmonedas?\b|\bcoins?\b/i);
  });

  it('sigue mostrando ⭐ como icono de puntos', () => {
    expect(src).toContain('⭐');
  });
});
