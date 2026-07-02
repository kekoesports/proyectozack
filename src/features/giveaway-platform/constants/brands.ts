/**
 * Config estática de partners/marcas visibles en el bloque "Bonuses" de la
 * plataforma de sorteos. Cuando queramos editar desde admin, migrar a tabla
 * platform_brand_partners (PR aparte).
 *
 * `logoAsset` apunta a `/images/brands/*.png` (assets reales del repo).
 * `agentAsset` apunta a `/images/agents/*` cuando existe personaje asociado.
 */

export type BrandKey = 'keydrop' | 'clash' | 'skinsmonkey' | 'skinclub' | 'gamdom';

export interface PlatformBrand {
  key: BrandKey;
  displayName: string;
  logoAsset: string | null;
  agentAsset: string | null;
  disclaimer: string;
}

export const PLATFORM_BRANDS: Record<BrandKey, PlatformBrand> = {
  keydrop: {
    key: 'keydrop',
    displayName: 'KeyDrop',
    logoAsset: '/images/brands/keydrop.png',
    // Banner de escena "HUGE MESS" recortado — reemplaza al agente/monedas
    // en el panel derecho de la card. NOTA: agentAsset se reutiliza como
    // asset visual "hero" del panel, la semántica no es estrictamente agente.
    agentAsset: '/images/brands/keydrop-banner.png',
    disclaimer: 'Juega con Responsabilidad · +18',
  },
  clash: {
    key: 'clash',
    displayName: 'Clash.gg',
    logoAsset: '/images/brands/clashgg.png',
    // Ex-agente de KeyDrop reasignado a Clash.
    agentAsset: '/images/agents/keydrop-agent.png',
    disclaimer: 'Juega con Responsabilidad · +18',
  },
  skinsmonkey: {
    key: 'skinsmonkey',
    displayName: 'SkinsMonkey',
    logoAsset: '/images/brands/skinsmonkey.png',
    // TODO(assets): la thumbnail actual viene de gstatic (JPEG s=10,
    // baja resolución). Reemplazar por PNG oficial cuando esté disponible.
    agentAsset: '/images/agents/skinsmonkey-agent.jpg',
    disclaimer: '',
  },
  skinclub: {
    key: 'skinclub',
    displayName: 'Skin.Club',
    logoAsset: '/images/brands/skinclub.png',
    agentAsset: '/images/agents/skinclub-agent.png',
    disclaimer: 'Juega con Responsabilidad · +18',
  },
  gamdom: {
    key: 'gamdom',
    displayName: 'Gamdom',
    // TODO(assets): drop gamdom logo en /public/images/brands/gamdom.png.
    // Mientras no exista, la card usa displayName como fallback textual.
    logoAsset: null,
    agentAsset: null,
    disclaimer: 'Juega con Responsabilidad · +18',
  },
};

export const PLATFORM_BRAND_ORDER: BrandKey[] = ['keydrop', 'clash', 'skinsmonkey', 'skinclub', 'gamdom'];
