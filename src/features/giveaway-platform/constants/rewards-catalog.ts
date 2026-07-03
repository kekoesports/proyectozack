/**
 * Catálogo de recompensas — 2026-07-03 (actualizado con skins reales).
 *
 * Fase 1: 8 skins CS2 con metadata real (nombre, imagen local, precio
 * en puntos, stock, Steam Market URL) confirmadas por el owner.
 *
 * Reglas:
 *  - Imágenes locales en `public/images/rewards/{slug}.png` — descargadas
 *    desde el CDN oficial de Steam (community.steamstatic.com) una sola
 *    vez con `scripts/enrich-rewards.ts`. No hay fetch runtime a Steam.
 *  - Precios en puntos son fijos, calibrados por el owner. NO se muestra
 *    ninguna conversión $/€ al usuario.
 *  - Stock: 1 unidad por skin. Cuando alcance 0, la card muestra "Agotado".
 *  - Delivery: `steam_trade_offer`. Todos los canjes requieren revisión
 *    manual antes del envío.
 *  - `steamMarketUrl` se conserva SOLO para trazabilidad interna — no
 *    se expone en la UI pública.
 *
 * Este archivo es la fuente de verdad del contenido. `scripts/seed-
 * socialpro-rewards-steam.ts` lee de aquí y sincroniza `shop_items` en DB
 * cuando el owner lo ejecuta explícitamente con la env var de confirmación.
 *
 * Ver:
 *  - docs/sorteos-rewards-catalog.md
 *  - docs/sorteos-coin-economy.md § conversión interna
 */

export type RewardStatus =
  | 'active'       // Metadata + precio + stock OK → canjeable.
  | 'coming_soon'  // Metadata OK, precio/stock pendientes.
  | 'planned';     // Solo idea/URL. Sin metadata fiable.

export type RewardDelivery = 'steam_trade_offer' | 'physical_shipping' | 'digital_code' | 'internal_cosmetic';

export interface CatalogReward {
  /** Slug único interno — coincide con nombre del PNG local y con `sortOrder`. */
  slug: string;
  /** Nombre canónico Steam Market — market_hash_name sin wear. */
  name: string;
  /** Wear del item, cuando aplica (skins). */
  wear: 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred' | null;
  /** Rareza tal como Steam la reporta (Restricted, Classified, Covert, etc.). */
  rarity: string | null;
  /** Categoría — coincide con `shop_items.category`. */
  category: 'skin' | 'gift' | 'merch' | 'team' | 'profile' | 'frame' | 'badge';
  /** Juego asociado. */
  game: 'CS2' | null;
  /** Ruta al PNG en el repo (relativa a /public). Debe existir. */
  imageUrl: string;
  /** Precio final en puntos SocialPro. `null` = pendiente de definir. */
  costPoints: number | null;
  /** Stock actual — el seed lo aplica en DB. `null` = pendiente de definir. */
  stock: number | null;
  /** Estado. `active` → aparece canjeable en la tienda una vez seedeado. */
  status: RewardStatus;
  /** URL del listing en Steam Market — solo interno / trazabilidad. */
  steamMarketUrl: string;
  /** Cómo se entrega el premio. */
  delivery: RewardDelivery;
  /** True si el canje requiere revisión manual antes del envío. */
  requiresManualReview: boolean;
  /** Descripción visible al usuario. NO cita precio €/$. */
  description: string;
}

/**
 * Las 8 skins CS2 confirmadas por el owner. Todas Field-Tested, con
 * imagen local, stock 1, y precio en puntos calibrado con multiplicador
 * ~1.3 sobre precio Steam Market en el momento del PR.
 *
 * Cuando alguna se agote (`stock: 0`), se retira o se rellena stock en un
 * PR de mantenimiento — no automático.
 */
export const REAL_STEAM_REWARDS: readonly CatalogReward[] = [
  {
    slug: 'glock-18-fully-tuned-ft',
    name: 'Glock-18 | Fully Tuned',
    wear: 'Field-Tested',
    rarity: 'Covert',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/glock-18-fully-tuned-ft.png',
    costPoints: 104_500,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G1804208D0B3004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin premium Covert. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
  {
    slug: 'usp-s-cortex-ft',
    name: 'USP-S | Cortex',
    wear: 'Field-Tested',
    rarity: 'Classified',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/usp-s-cortex-ft.png',
    costPoints: 6_500,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G183D20C1053004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin Classified. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
  {
    slug: 'm4a4-temukau-ft',
    name: 'M4A4 | Temukau',
    wear: 'Field-Tested',
    rarity: 'Covert',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/m4a4-temukau-ft.png',
    costPoints: 57_700,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G181020CC093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin Covert. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
  {
    slug: 'ak-47-asiimov-ft',
    name: 'AK-47 | Asiimov',
    wear: 'Field-Tested',
    rarity: 'Covert',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/ak-47-asiimov-ft.png',
    costPoints: 70_000,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G180720A1063004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730&detail=555779260423308555',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin Covert icónica. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
  {
    slug: 'm4a4-desolate-space-ft',
    name: 'M4A4 | Desolate Space',
    wear: 'Field-Tested',
    rarity: 'Classified',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/m4a4-desolate-space-ft.png',
    costPoints: 23_200,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G181020CC043004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin Classified. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
  {
    slug: 'glock-18-vogue-ft',
    name: 'Glock-18 | Vogue',
    wear: 'Field-Tested',
    rarity: 'Classified',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/glock-18-vogue-ft.png',
    costPoints: 6_700,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G180420C3073004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin Classified. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
  {
    slug: 'glock-18-block-18-ft',
    name: 'Glock-18 | Block-18',
    wear: 'Field-Tested',
    rarity: 'Restricted',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/glock-18-block-18-ft.png',
    costPoints: 800,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G1804208F093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin Restricted. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
  {
    slug: 'awp-atheris-ft',
    name: 'AWP | Atheris',
    wear: 'Field-Tested',
    rarity: 'Restricted',
    category: 'skin',
    game: 'CS2',
    imageUrl: '/images/rewards/awp-atheris-ft.png',
    costPoints: 8_100,
    stock: 1,
    status: 'active',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G180920C6063004?category_Type=CSGO_Type_SniperRifle&category_Exterior=WearCategory2&appid=730&detail=555779260423635183',
    delivery: 'steam_trade_offer',
    requiresManualReview: true,
    description: 'Skin AWP Restricted. Envío por Steam Trade Offer · stock limitado · canje sujeto a revisión manual.',
  },
] as const;

/**
 * @deprecated Reemplazado por `REAL_STEAM_REWARDS` con metadata real.
 * Se mantiene el símbolo como alias vacío para no romper imports que
 * puedan quedar. Se eliminará en un PR de limpieza cuando confirmemos
 * que ningún componente lo consume.
 */
export const PLANNED_REWARDS: readonly CatalogReward[] = [];

/**
 * Camisetas de equipos CS2 top — planificadas, no canjeables.
 *
 * Estado: cada card se muestra con placeholder visual + copy "Diseño
 * pendiente de confirmación". Sin imagen fiable → placeholder premium.
 * Sin logos oficiales de equipos ni diseños oficiales — dependemos de
 * mockups SocialPro o de permisos oficiales antes de activarlos.
 *
 * Cuando se apruebe cada camiseta, se aporta imagen local + precio en
 * puntos + stock, se mueve a `shop_items` vía seed y se retira de este
 * array.
 *
 * Ver `docs/sorteos-rewards-catalog.md` §Team merch para el flujo de
 * activación.
 */
export const PLANNED_TEAM_MERCH: readonly CatalogReward[] = [
  createPlannedTeamMerch('vitality', 'Camiseta Team Vitality'),
  createPlannedTeamMerch('spirit', 'Camiseta Team Spirit'),
  createPlannedTeamMerch('furia', 'Camiseta FURIA'),
  createPlannedTeamMerch('navi', 'Camiseta NAVI'),
  createPlannedTeamMerch('aurora', 'Camiseta Aurora'),
  createPlannedTeamMerch('g2', 'Camiseta G2 Esports'),
  createPlannedTeamMerch('9z', 'Camiseta 9z'),
  createPlannedTeamMerch('mouz', 'Camiseta MOUZ'),
  createPlannedTeamMerch('betboom', 'Camiseta BetBoom'),
  createPlannedTeamMerch('legacy', 'Camiseta Legacy'),
  createPlannedTeamMerch('fnatic', 'Camiseta Fnatic'),
] as const;

/**
 * Factory helper — mantiene los defaults consistentes y evita duplicar
 * `null`/`'planned'`/`description` en cada entrada.
 */
function createPlannedTeamMerch(slug: string, name: string): CatalogReward {
  return {
    slug: `team-shirt-${slug}`,
    name,
    wear: null,
    rarity: null,
    category: 'team',
    game: 'CS2',
    imageUrl: '',
    costPoints: null,
    stock: null,
    status: 'planned',
    steamMarketUrl: '',
    delivery: 'physical_shipping',
    requiresManualReview: true,
    description: 'Merch CS2 · Próximamente · Diseño pendiente de confirmación.',
  };
}
