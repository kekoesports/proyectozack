/**
 * Configuración legal por país / jurisdicción.
 *
 * Fuente de verdad para el gating server-side de módulos sensibles
 * (KeyDrop CTAs, partner externos, wagering copy, gift-cards, skins).
 *
 * Se combina con feature flags de compilación (`feature-flags.ts`) y
 * con el país detectado vía `x-vercel-ip-country` en Server Components
 * y Server Actions.
 *
 * Cambios en esta matriz suelen implicar cambios en:
 *   - `BrandCard*` (rendering restricted vs full)
 *   - Tests de `sensitive-copy-allowlist`
 *   - `docs/external-partners.md`
 *   - `docs/legal-risk-matrix.md`
 *
 * NO es asesoramiento jurídico. Registro operativo para producto.
 */

import {
  EXTERNAL_PARTNER_CTAS_ENABLED,
  GIFT_CARDS_REWARDS_ENABLED,
  KEYDROP_EXTERNAL_CTAS_ENABLED,
  MERCH_REWARDS_ENABLED,
  SKINS_REWARDS_ENABLED,
  WAGERING_COPY_ALLOWED,
} from './feature-flags';

/** ISO 3166-1 alpha-2. `null` == país desconocido → tratar como default más restrictivo. */
export type CountryCode = string;

export interface GeoLegalConfig {
  readonly country: CountryCode;
  /** CTAs de KeyDrop (VIP Club, "200% Bonus", "wagering"…). */
  readonly keydropExternalCTAs: boolean;
  /** CTAs de partners externos genéricos (SkinsMonkey, Skin.Club, Csgoskins). */
  readonly externalPartnerCTAs: boolean;
  /** Términos como "wagering", "deposit", "bonus" en UI de partner. */
  readonly wageringCopyAllowed: boolean;
  /** Gift-cards Riot/Steam/PSN visibles en tienda. */
  readonly giftCardsRewards: boolean;
  /** Skins CS2 visibles en tienda / sorteos (restricción del usuario: siempre visibles). */
  readonly skinsRewards: boolean;
  /** Merch de esports visible en tienda. */
  readonly merchRewards: boolean;
  /** Edad mínima efectiva para participar. */
  readonly ageMin: 18 | 16;
  /** Requiere PartnerExternalNotice explícito encima de cards externas. */
  readonly requirePartnerExternalNotice: boolean;
}

/**
 * Matriz por país. `default` se aplica cuando el país no está mapeado
 * o cuando `country` es `null | undefined`.
 *
 * España (ES): configuración más restrictiva por defecto — sin CTAs de
 * KeyDrop ni de partners externos hasta validación legal (R1).
 * Andorra (AD) / Chipre (CY): tratamiento provisional; no significa que
 * sean jurisdicciones "seguras", solo un placeholder para operativa
 * futura tras revisión regulatoria (ver docs/legal-risk-matrix.md).
 * INT: resto del mundo — configuración menos restrictiva que ES
 * mientras no haya una decisión legal específica para esos mercados.
 */
const CONFIGS: Readonly<Record<'ES' | 'AD' | 'CY' | 'INT', Omit<GeoLegalConfig, 'country'>>> = {
  ES: {
    keydropExternalCTAs:          KEYDROP_EXTERNAL_CTAS_ENABLED,
    externalPartnerCTAs:          EXTERNAL_PARTNER_CTAS_ENABLED,
    wageringCopyAllowed:          WAGERING_COPY_ALLOWED,
    giftCardsRewards:             GIFT_CARDS_REWARDS_ENABLED,
    skinsRewards:                 SKINS_REWARDS_ENABLED,
    merchRewards:                 MERCH_REWARDS_ENABLED,
    ageMin:                       18,
    requirePartnerExternalNotice: true,
  },
  AD: {
    keydropExternalCTAs:          KEYDROP_EXTERNAL_CTAS_ENABLED,
    externalPartnerCTAs:          EXTERNAL_PARTNER_CTAS_ENABLED,
    wageringCopyAllowed:          WAGERING_COPY_ALLOWED,
    giftCardsRewards:             GIFT_CARDS_REWARDS_ENABLED,
    skinsRewards:                 SKINS_REWARDS_ENABLED,
    merchRewards:                 MERCH_REWARDS_ENABLED,
    ageMin:                       18,
    requirePartnerExternalNotice: true,
  },
  CY: {
    keydropExternalCTAs:          KEYDROP_EXTERNAL_CTAS_ENABLED,
    externalPartnerCTAs:          EXTERNAL_PARTNER_CTAS_ENABLED,
    wageringCopyAllowed:          WAGERING_COPY_ALLOWED,
    giftCardsRewards:             GIFT_CARDS_REWARDS_ENABLED,
    skinsRewards:                 SKINS_REWARDS_ENABLED,
    merchRewards:                 MERCH_REWARDS_ENABLED,
    ageMin:                       18,
    requirePartnerExternalNotice: true,
  },
  INT: {
    keydropExternalCTAs:          true,
    externalPartnerCTAs:          true,
    wageringCopyAllowed:          true,
    giftCardsRewards:             GIFT_CARDS_REWARDS_ENABLED,
    skinsRewards:                 SKINS_REWARDS_ENABLED,
    merchRewards:                 MERCH_REWARDS_ENABLED,
    ageMin:                       18,
    requirePartnerExternalNotice: true,
  },
};

/**
 * Devuelve la configuración legal para un país.
 * `country` puede venir directamente de `headers().get('x-vercel-ip-country')`.
 * Si el país es `null | undefined | ''`, aplica configuración ES (más
 * restrictiva) por precaución.
 */
export function getGeoLegalConfig(country: string | null | undefined): GeoLegalConfig {
  const c = (country ?? '').toUpperCase().trim();
  if (c === 'ES') return { country: 'ES', ...CONFIGS.ES };
  if (c === 'AD') return { country: 'AD', ...CONFIGS.AD };
  if (c === 'CY') return { country: 'CY', ...CONFIGS.CY };
  if (c === '')   return { country: 'ES', ...CONFIGS.ES };
  return { country: c, ...CONFIGS.INT };
}

/**
 * Helper explícito para renderizado condicional: ¿la card debe mostrar
 * la versión completa (con bonus/wagering/VIP) o la versión restringida?
 *
 * True si el país permite los CTAs de partners externos. Por defecto en
 * ES devuelve false.
 */
export function shouldRenderPartnerCtaFull(country: string | null | undefined, partner: 'keydrop' | 'generic'): boolean {
  const cfg = getGeoLegalConfig(country);
  if (partner === 'keydrop') return cfg.keydropExternalCTAs;
  return cfg.externalPartnerCTAs;
}
