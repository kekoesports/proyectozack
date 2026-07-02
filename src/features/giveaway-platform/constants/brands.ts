/**
 * Config estática de partners/marcas visibles en el bloque "Bonuses" de la
 * plataforma de sorteos. Cuando queramos editar desde admin, migrar a tabla
 * platform_brand_partners (PR aparte).
 *
 * `codeSlot` señala qué palabra intercambiar por el código del creador activo
 * en runtime (data-code / data-code-cs del prototipo v2).
 */

export type BrandKey = 'csdrop' | 'clash' | 'skinsmonkey' | 'skinclub' | 'gamdom';

export interface PlatformBrand {
  key: BrandKey;
  displayName: string;
  logoAsset: string;
  agentAsset: string | null;
  disclaimer: string;
}

export const PLATFORM_BRANDS: Record<BrandKey, PlatformBrand> = {
  csdrop: {
    key: 'csdrop',
    displayName: 'CSDrop',
    logoAsset: '/assets/brands/csdrop.svg',
    agentAsset: '/assets/agents/vip.png',
    disclaimer: 'Juega con Responsabilidad · +18',
  },
  clash: {
    key: 'clash',
    displayName: 'Clash.gg',
    logoAsset: '/assets/brands/clash.svg',
    agentAsset: null,
    disclaimer: 'Juega con Responsabilidad · +18',
  },
  skinsmonkey: {
    key: 'skinsmonkey',
    displayName: 'SkinsMonkey',
    logoAsset: '/assets/brands/skinsmonkey.svg',
    agentAsset: null,
    disclaimer: '',
  },
  skinclub: {
    key: 'skinclub',
    displayName: 'Skin.Club',
    logoAsset: '/assets/brands/skinclub.svg',
    agentAsset: '/assets/agents/swat.png',
    disclaimer: 'Juega con Responsabilidad · +18',
  },
  gamdom: {
    key: 'gamdom',
    displayName: 'Gamdom',
    logoAsset: '/assets/brands/gamdom.svg',
    agentAsset: null,
    disclaimer: 'Juega con Responsabilidad · +18',
  },
};

export const PLATFORM_BRAND_ORDER: BrandKey[] = ['csdrop', 'clash', 'skinsmonkey', 'skinclub', 'gamdom'];
