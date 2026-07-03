/**
 * Config estática de partners/marcas visibles en el bloque "Bonuses" de la
 * plataforma de sorteos. Cuando queramos editar desde admin, migrar a tabla
 * platform_brand_partners (PR aparte).
 *
 * `logoAsset` apunta a `/images/brands/*.png` (assets reales del repo).
 * `agentAsset` apunta a `/images/agents/*` cuando existe personaje asociado.
 */

export type BrandKey = 'keydrop' | 'csgoskins' | 'skinsmonkey' | 'skinclub';

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
  csgoskins: {
    key: 'csgoskins',
    displayName: 'CSGO-SKINS',
    logoAsset: '/images/brands/csgoskins.png',
    // Banner promocional del evento activo del partner (Dust II Roadtrip,
    // 2026-07). Uso autorizado por CSGO-SKINS como affiliate. Se reemplaza
    // cuando el partner lance un evento nuevo.
    agentAsset: '/images/brands/csgoskins-roadtrip.png',
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
};

export const PLATFORM_BRAND_ORDER: BrandKey[] = ['keydrop', 'csgoskins', 'skinsmonkey', 'skinclub'];
