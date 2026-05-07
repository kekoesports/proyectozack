/**
 * Marcas de iGaming / skins que requieren aviso +18 y mensajes de juego responsable.
 * Normalizar a mayúsculas antes de comparar.
 */
export const IGAMING_BRANDS = new Set([
  'KEYDROP',
  'KEY-DROP',
  'HELLCASE',
  'HELL CASE',
  'SKINPLACE',
  'SKIN PLACE',
  'SKINSMONKEY',
  'SKINS MONKEY',
  'CSGO500',
  'CSGOEMPIRE',
  'DRAKEMOON',
  'FARMSKINS',
  'HYPEDROP',
  'UPGRADER',
]);

export function isIGamingBrand(brandName: string): boolean {
  return IGAMING_BRANDS.has(brandName.toUpperCase().trim());
}
