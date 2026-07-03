/**
 * Catálogo de recompensas planificadas — 2026-07-03.
 *
 * Fase 1: 8 skins CS2 con su URL de Steam Market como fuente de verdad.
 *
 * IMPORTANTE:
 *  - Estas recompensas NO están en `shop_items` (DB). Se renderizan como
 *    "Recompensas próximas" en `PlatformShop.tsx` de forma puramente
 *    visual, no canjeables.
 *  - No hay scraping de Steam Market en producción. Los títulos son
 *    placeholders (`CS2 Skin Reward #N`) hasta que se apruebe metadata
 *    fiable manualmente.
 *  - `costPoints: null` y `stock: null` significan "pendiente de precio
 *    y stock". La UI muestra "Pendiente de precio" / "Pendiente de stock"
 *    y bloquea el canjeo.
 *  - `imageUrl: null` significa "sin imagen fiable". La UI pinta el
 *    placeholder premium (`.gp-reward-placeholder`) — no la card fea
 *    plana de "Imagen pendiente".
 *
 * Ver `docs/sorteos-rewards-catalog.md` para el estado detallado, la
 * regla interna de conversión coste→puntos (no publicada al usuario) y
 * el flujo de activación cuando se apruebe cada recompensa.
 */

export type PlannedRewardStatus =
  | 'planned'      // Definida pero sin metadata/precio/stock — nunca canjeable.
  | 'coming_soon'  // Metadata OK, precio/stock pendientes — nunca canjeable.
  | 'active';      // Metadata + precio + stock OK — canjeable (vive en DB, no aquí).

export interface PlannedReward {
  /** Slug único interno. */
  slug: string;
  /** Título placeholder o real si se aprobó metadata. */
  title: string;
  /** URL canónica de Steam Market — fuente de verdad. */
  steamMarketUrl: string;
  /** Categoría de la recompensa. */
  category: 'skin' | 'gift' | 'merch' | 'profile' | 'frame' | 'badge';
  /** Juego asociado (para skins). */
  game: 'CS2' | null;
  /** URL de imagen fiable o `null` si aún no la tenemos. */
  imageUrl: string | null;
  /** Precio en puntos o `null` si aún no se ha aprobado. */
  costPoints: number | null;
  /** Stock disponible o `null` si aún no se ha confirmado. */
  stock: number | null;
  /** Estado — nunca `active` en este archivo (los activos viven en DB). */
  status: Exclude<PlannedRewardStatus, 'active'>;
}

/**
 * Los 8 items iniciales fase 1. Todos `planned`, sin metadata fiable,
 * sin precio, sin stock — no canjeables. Cuando el owner apruebe cada
 * uno, se mueven a `shop_items` (DB) con precio real y se retira de
 * este array.
 */
export const PLANNED_REWARDS: readonly PlannedReward[] = [
  {
    slug: 'cs2-skin-reward-1',
    title: 'CS2 Skin Reward #1',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G1804208D0B3004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
  {
    slug: 'cs2-skin-reward-2',
    title: 'CS2 Skin Reward #2',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G183D20C1053004?category_Type=CSGO_Type_Pistol&category_Exterior=WearCategory2&appid=730',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
  {
    slug: 'cs2-skin-reward-3',
    title: 'CS2 Skin Reward #3',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G181020CC093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
  {
    slug: 'cs2-skin-reward-4',
    title: 'CS2 Skin Reward #4',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G180720A1063004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730&detail=555779260423308555',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
  {
    slug: 'cs2-skin-reward-5',
    title: 'CS2 Skin Reward #5',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G181020CC043004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
  {
    slug: 'cs2-skin-reward-6',
    title: 'CS2 Skin Reward #6',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G180420C3073004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
  {
    slug: 'cs2-skin-reward-7',
    title: 'CS2 Skin Reward #7',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G1804208F093004?category_Type=CSGO_Type_Pistol&category_Type=CSGO_Type_Rifle&category_Exterior=WearCategory2&appid=730',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
  {
    slug: 'cs2-skin-reward-8',
    title: 'CS2 Skin Reward #8',
    steamMarketUrl:
      'https://steamcommunity.com/market/listings/730/G180920C6063004?category_Type=CSGO_Type_SniperRifle&category_Exterior=WearCategory2&appid=730',
    category: 'skin',
    game: 'CS2',
    imageUrl: null,
    costPoints: null,
    stock: null,
    status: 'planned',
  },
] as const;
