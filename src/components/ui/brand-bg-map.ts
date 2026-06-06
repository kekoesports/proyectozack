/**
 * Mapping marca → fondo (plate) recomendado para presentar el logo.
 *
 * - `light`: plate blanco. Default — sirve para la mayoría de logos en color
 *            o con outlines visibles sobre blanco.
 * - `dark`:  plate oscuro. Para logos con artwork blanco/claro que serían
 *            invisibles sobre blanco (texto en blanco, etc.).
 *
 * La clave de lookup es el `displayName` o `brandName` normalizado:
 * UPPERCASE sin espacios/guiones/puntos. Mantener el override solo cuando
 * la versión "neutra" en plate blanco no funciona — la mayoría queda con
 * default `light`.
 *
 * @kind shared
 */

export type BrandBg = 'light' | 'dark';

const BRAND_BG_OVERRIDES: Readonly<Record<string, BrandBg>> = {
  // White-on-transparent o color sin contraste sobre blanco
  KEYDROP:    'dark', // texto "drop" en blanco
  SKINSMONKEY:'dark', // texto "skinsmonkey" en blanco
  SKINPLACE:  'dark', // texto "SKINPLACE" en blanco/gris claro
  CSGOSKINS:  'dark', // icono + texto en blanco
  YOSPORTS:   'dark', // "Yo" en blanco, "Sports" en lima
};

const DEFAULT_BRAND_BG: BrandBg = 'light';

/**
 * Normaliza el nombre de marca para lookup en el override map.
 * Ej: "Skin.place" → "SKINPLACE", "Pin-Up" → "PINUP".
 */
export function normalizeBrandKey(name: string): string {
  return name.toUpperCase().replace(/[\s\-_.]/g, '');
}

/**
 * Resuelve el plate recomendado para una marca por displayName.
 * Default: `light` (plate blanco).
 */
export function getBrandBg(brandName: string): BrandBg {
  return BRAND_BG_OVERRIDES[normalizeBrandKey(brandName)] ?? DEFAULT_BRAND_BG;
}
